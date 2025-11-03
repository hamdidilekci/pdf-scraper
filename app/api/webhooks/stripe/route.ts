import { NextRequest, NextResponse } from 'next/server'
import { StripeService } from '@/lib/services/stripe.service'
import { CreditService } from '@/lib/services/credit.service'
import { config } from '@/lib/config'
import { logger } from '@/lib/logger'
import { PLAN_TYPES, PLAN_CREDITS } from '@/lib/constants'
import prisma from '@/lib/prisma'
import Stripe from 'stripe'

export const runtime = 'nodejs'

// Next.js needs this to disable body parsing for webhook signature verification
export const dynamic = 'force-dynamic'

async function getRawBody(request: Request): Promise<Buffer> {
	const chunks: Uint8Array[] = []
	const reader = request.body?.getReader()

	if (!reader) {
		throw new Error('Request body is not readable')
	}

	while (true) {
		const { done, value } = await reader.read()
		if (done) break
		if (value) chunks.push(value)
	}

	return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)))
}

type CheckoutSessionWithMetadata = Stripe.Checkout.Session & {
	metadata?: {
		userId?: string
		planType?: string
		priceId?: string
	}
}

type InvoiceWithSubscription = Stripe.Invoice & {
	subscription?: string | Stripe.Subscription | null
	subscription_details?: {
		subscription?: string | Stripe.Subscription | null
	}
}

type InvoiceLineWithPrice = Stripe.InvoiceLineItem & {
	price?: Stripe.Price | null
	plan?: Stripe.Plan | null
}

function extractSubscriptionId(invoice: InvoiceWithSubscription): string | null {
	if (typeof invoice.subscription === 'string') {
		return invoice.subscription
	}
	if (invoice.subscription && typeof invoice.subscription === 'object') {
		return invoice.subscription.id
	}
	if (typeof invoice.subscription_details?.subscription === 'string') {
		return invoice.subscription_details.subscription
	}
	if (invoice.subscription_details?.subscription && typeof invoice.subscription_details.subscription === 'object') {
		return invoice.subscription_details.subscription.id
	}

	if (invoice.lines?.data) {
		for (const line of invoice.lines.data) {
			const lineWithSub = line as InvoiceLineWithPrice & { subscription?: string | { id?: string } }
			if (lineWithSub.subscription) {
				if (typeof lineWithSub.subscription === 'string') {
					return lineWithSub.subscription
				}
				if (typeof lineWithSub.subscription === 'object' && lineWithSub.subscription.id) {
					return lineWithSub.subscription.id
				}
			}
		}
	}

	return null
}

function extractPriceIdFromInvoice(invoice: Stripe.Invoice): string | null {
	const lines = invoice.lines?.data ?? []
	for (const line of lines) {
		const lineWithPrice = line as InvoiceLineWithPrice
		if (lineWithPrice.price?.id) {
			return lineWithPrice.price.id
		}
		if (lineWithPrice.plan?.id) {
			return lineWithPrice.plan.id
		}
	}
	return null
}

export async function POST(request: NextRequest) {
	const stripeService = new StripeService()
	const creditService = new CreditService()

	try {
		// Check if Stripe is configured
		if (!config.stripe.secretKey || !config.stripe.webhookSecret) {
			logger.error('Stripe webhook secret not configured')
			return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
		}

		// Get raw body and signature
		const body = await getRawBody(request)
		const signature = request.headers.get('stripe-signature')

		if (!signature) {
			logger.warn('Missing Stripe signature in webhook request')
			return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
		}

		// Construct and verify webhook event
		let event: Stripe.Event
		try {
			event = stripeService.constructWebhookEvent(body, signature)
		} catch (error) {
			logger.error('Webhook signature verification failed', error)
			return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
		}

		// Log webhook event
		try {
			await prisma.stripeWebhookEvent.upsert({
				where: { eventId: event.id },
				create: {
					eventId: event.id,
					eventType: event.type,
					data: event.data.object as any,
					processed: false
				},
				update: {} // idempotency
			})
		} catch (error) {
			// Log error but continue processing
			logger.error('Error logging webhook event', error, { eventId: event.id })
		}

		// Process event asynchronously (return 200 immediately)
		processWebhookEvent(event, creditService, stripeService).catch((error) => {
			logger.error('Error processing webhook event', error, { eventId: event.id, eventType: event.type })
		})

		return NextResponse.json({ received: true })
	} catch (error) {
		logger.error('Webhook handler error', error)
		return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
	}
}

async function processWebhookEvent(event: Stripe.Event, creditService: CreditService, stripeService: StripeService): Promise<void> {
	try {
		// Check if event was already processed
		const existingEvent = await prisma.stripeWebhookEvent.findUnique({
			where: { eventId: event.id },
			select: { processed: true }
		})

		if (existingEvent?.processed) {
			logger.info('Webhook event already processed, skipping', { eventId: event.id, eventType: event.type })
			return
		}

		switch (event.type) {
			case 'checkout.session.completed': {
				const session = event.data.object as CheckoutSessionWithMetadata
				await handleCheckoutSessionCompleted(session, stripeService)
				break
			}

			case 'customer.subscription.updated': {
				const subscription = event.data.object as Stripe.Subscription
				await handleSubscriptionUpdated(subscription, creditService)
				break
			}

			case 'customer.subscription.deleted': {
				const subscription = event.data.object as Stripe.Subscription
				await handleSubscriptionDeleted(subscription)
				break
			}

			case 'invoice.payment_succeeded': {
				const invoice = event.data.object as Stripe.Invoice
				await handleInvoicePaymentSucceeded(invoice, creditService, stripeService)
				break
			}

			case 'customer.deleted': {
				const customer = event.data.object as Stripe.Customer
				await handleCustomerDeleted(customer)
				break
			}

			default:
				logger.info('Unhandled webhook event type', { eventType: event.type, eventId: event.id })
		}

		// Mark event as processed
		await prisma.stripeWebhookEvent.update({
			where: { eventId: event.id },
			data: { processed: true }
		})

		logger.info('Webhook event processed successfully', { eventId: event.id, eventType: event.type })
	} catch (error) {
		logger.error('Error processing webhook event', error, { eventId: event.id, eventType: event.type })
		throw error
	}
}

async function handleCheckoutSessionCompleted(session: CheckoutSessionWithMetadata, stripeService: StripeService): Promise<void> {
	try {
		const userId = session.metadata?.userId
		if (!userId) {
			logger.warn('Checkout session missing userId metadata', { sessionId: session.id })
			return
		}

		const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
		if (!subscriptionId) {
			logger.warn('Checkout session missing subscription', { sessionId: session.id })
			return
		}

		let planType: 'BASIC' | 'PRO' | null = null
		const metadataPlan = session.metadata?.planType
		if (metadataPlan === PLAN_TYPES.BASIC || metadataPlan === PLAN_TYPES.PRO) {
			planType = metadataPlan
		}

		let priceId = session.metadata?.priceId

		if (!planType || !priceId) {
			const subscription = await stripeService.getSubscription(subscriptionId)
			if (!subscription) {
				logger.warn('Subscription not found', { subscriptionId })
				return
			}

			priceId = priceId || subscription.items.data[0]?.price?.id || undefined
			if (!planType && priceId) {
				planType = priceId === config.stripe.priceBasic ? PLAN_TYPES.BASIC : priceId === config.stripe.pricePro ? PLAN_TYPES.PRO : null
			}
		}

		if (!planType) {
			logger.warn('Unable to resolve plan type from checkout session', {
				sessionId: session.id,
				metadataPlan,
				priceId
			})
			return
		}

		const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
		if (!customerId) {
			logger.warn('Checkout session missing customer', { sessionId: session.id })
			return
		}

		await prisma.user.update({
			where: { id: userId },
			data: {
				planType,
				stripeSubscriptionId: subscriptionId,
				stripeCustomerId: customerId
			}
		})
	} catch (error) {
		logger.error('Error handling checkout.session.completed', error, { sessionId: session.id })
		throw error
	}
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription, creditService: CreditService): Promise<void> {
	try {
		const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id

		const user = await prisma.user.findFirst({
			where: { stripeCustomerId: customerId },
			select: { id: true, planType: true }
		})

		if (!user) {
			logger.warn('User not found for subscription update', { customerId, subscriptionId: subscription.id })
			return
		}

		const priceId = subscription.items.data[0]?.price.id
		const newPlanType = priceId === config.stripe.priceBasic ? PLAN_TYPES.BASIC : priceId === config.stripe.pricePro ? PLAN_TYPES.PRO : null

		if (!newPlanType) {
			logger.warn('Unknown plan type from subscription update', { subscriptionId: subscription.id, priceId })
			return
		}

		await prisma.user.update({
			where: { id: user.id },
			data: { planType: newPlanType }
		})

		logger.info('User subscription plan updated', {
			userId: user.id,
			previousPlanType: user.planType,
			planType: newPlanType,
			subscriptionId: subscription.id
		})
	} catch (error) {
		logger.error('Error handling subscription.updated', error, { subscriptionId: subscription.id })
		throw error
	}
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
	try {
		const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id

		const user = await prisma.user.findFirst({
			where: { stripeCustomerId: customerId },
			select: { id: true }
		})

		if (!user) {
			logger.warn('User not found for subscription deletion', { customerId, subscriptionId: subscription.id })
			return
		}

		// Remove subscription but keep customer ID (they might resubscribe)
		await prisma.user.update({
			where: { id: user.id },
			data: {
				planType: null,
				stripeSubscriptionId: null
			}
		})

		logger.info('User subscription deactivated', {
			userId: user.id,
			subscriptionId: subscription.id
		})
	} catch (error) {
		logger.error('Error handling subscription.deleted', error, { subscriptionId: subscription.id })
		throw error
	}
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice, creditService: CreditService, stripeService: StripeService): Promise<void> {
	try {
		const expandedInvoice = await stripeService.getInvoice(invoice.id)
		const invoiceData = (expandedInvoice || invoice) as InvoiceWithSubscription

		const subscriptionId =
			typeof invoiceData.subscription === 'string'
				? invoiceData.subscription
				: invoiceData.subscription && typeof invoiceData.subscription === 'object'
				? invoiceData.subscription.id
				: extractSubscriptionId(invoiceData)

		const customerId =
			typeof invoice.customer === 'string'
				? invoice.customer
				: invoice.customer && typeof invoice.customer === 'object'
				? invoice.customer.id || (invoice.customer as any).customer
				: typeof expandedInvoice?.customer === 'string'
				? (expandedInvoice.customer as string)
				: null

		if (!customerId) {
			logger.warn('Invoice payment succeeded without customer ID', { invoiceId: invoice.id })
			return
		}

		const priceId = extractPriceIdFromInvoice(invoiceData)
		let planType: 'BASIC' | 'PRO' | null =
			priceId === config.stripe.priceBasic ? PLAN_TYPES.BASIC : priceId === config.stripe.pricePro ? PLAN_TYPES.PRO : null

		const user = await prisma.user.findFirst({
			where: { stripeCustomerId: customerId },
			select: { id: true, planType: true }
		})

		if (!user) {
			logger.warn('No user found for invoice payment', { customerId, invoiceId: invoice.id })
			return
		}

		if (!planType && user.planType && (user.planType === PLAN_TYPES.BASIC || user.planType === PLAN_TYPES.PRO)) {
			planType = user.planType
		}

		if (!planType && subscriptionId) {
			const subscription = await stripeService.getSubscription(subscriptionId)
			if (subscription) {
				const subPriceId = subscription.items.data[0]?.price?.id
				if (subPriceId) {
					planType = subPriceId === config.stripe.priceBasic ? PLAN_TYPES.BASIC : subPriceId === config.stripe.pricePro ? PLAN_TYPES.PRO : null
				}
			}
		}

		if (!planType) {
			logger.warn('Unable to determine plan type from invoice payment', {
				invoiceId: invoice.id,
				priceId,
				subscriptionId,
				expanded: !!expandedInvoice
			})
			return
		}

		await prisma.user.update({
			where: { id: user.id },
			data: {
				planType,
				stripeCustomerId: customerId,
				...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {})
			}
		})

		const creditsToAdd = planType === PLAN_TYPES.BASIC ? PLAN_CREDITS.BASIC : PLAN_CREDITS.PRO
		await creditService.addCredits(user.id, creditsToAdd)

		logger.info('Credits added after invoice payment', {
			userId: user.id,
			planType,
			creditsAdded: creditsToAdd,
			invoiceId: invoice.id,
			billingReason: expandedInvoice?.billing_reason || invoice.billing_reason,
			subscriptionId
		})
	} catch (error) {
		logger.error('Error handling invoice.payment_succeeded', error, { invoiceId: invoice.id })
		throw error
	}
}

// handle customer deleted
async function handleCustomerDeleted(customer: Stripe.Customer): Promise<void> {
	try {
		const user = await prisma.user.findFirst({
			where: { stripeCustomerId: customer.id },
			select: { id: true }
		})

		if (!user) {
			logger.warn('User not found for customer deletion', { customerId: customer.id })
			return
		}

		await prisma.user.update({
			where: { id: user.id },
			data: {
				planType: null,
				stripeSubscriptionId: null,
				stripeCustomerId: null,
				credits: 0
			}
		})

		logger.info('User customer deleted', {
			userId: user.id
		})
	} catch (error) {
		logger.error('Error handling customer.deleted', error, { customerId: customer?.id })
		throw error
	}
}
