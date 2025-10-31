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
				update: {} // Don't update if already exists (idempotency)
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
				const session = event.data.object as Stripe.Checkout.Session
				await handleCheckoutSessionCompleted(session, creditService, stripeService)
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

			case 'invoice.paid': {
				const invoice = event.data.object as Stripe.Invoice
				await handleInvoicePaid(invoice, creditService, stripeService)
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

async function handleCheckoutSessionCompleted(
	session: Stripe.Checkout.Session,
	creditService: CreditService,
	stripeService: StripeService
): Promise<void> {
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

		// Get subscription to determine plan type
		const subscription = await stripeService.getSubscription(subscriptionId)
		if (!subscription) {
			logger.warn('Subscription not found', { subscriptionId })
			return
		}

		const priceId = subscription.items.data[0]?.price.id
		const planType = priceId === config.stripe.priceBasic ? PLAN_TYPES.BASIC : priceId === config.stripe.pricePro ? PLAN_TYPES.PRO : null

		if (!planType) {
			logger.warn('Unknown plan type from subscription', { subscriptionId, priceId })
			return
		}

		// Update user with subscription info and add credits
		await prisma.$transaction(async (tx) => {
			const user = await tx.user.findUnique({ where: { id: userId } })
			if (!user) {
				throw new Error(`User not found: ${userId}`)
			}

			const creditsToAdd = planType === PLAN_TYPES.BASIC ? PLAN_CREDITS.BASIC : PLAN_CREDITS.PRO

			await tx.user.update({
				where: { id: userId },
				data: {
					planType,
					stripeSubscriptionId: subscriptionId,
					stripeCustomerId: session.customer as string,
					credits: { increment: creditsToAdd }
				}
			})

			logger.info('User subscription activated', {
				userId,
				planType,
				creditsAdded: creditsToAdd,
				subscriptionId
			})
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

		// If upgrading from BASIC to PRO, add credits
		if (user.planType === PLAN_TYPES.BASIC && newPlanType === PLAN_TYPES.PRO) {
			const creditsToAdd = PLAN_CREDITS.PRO

			await prisma.user.update({
				where: { id: user.id },
				data: {
					planType: newPlanType,
					credits: { increment: creditsToAdd }
				}
			})

			logger.info('User upgraded to Pro plan', {
				userId: user.id,
				creditsAdded: creditsToAdd,
				subscriptionId: subscription.id
			})
		} else {
			// Just update plan type
			await prisma.user.update({
				where: { id: user.id },
				data: { planType: newPlanType }
			})

			logger.info('User subscription plan updated', {
				userId: user.id,
				planType: newPlanType,
				subscriptionId: subscription.id
			})
		}
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

async function handleInvoicePaid(invoice: Stripe.Invoice, creditService: CreditService, stripeService: StripeService): Promise<void> {
	try {
		// Only process if this is a subscription invoice
		if (!invoice.subscription || typeof invoice.subscription === 'string') {
			// This is a subscription invoice, but credits should already be added via checkout.session.completed
			// Only add credits if this is a renewal (not the initial payment)
			const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : null
			if (!subscriptionId) {
				return
			}

			const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
			if (!customerId) {
				return
			}

			const user = await prisma.user.findFirst({
				where: { stripeCustomerId: customerId },
				select: { id: true, planType: true }
			})

			if (!user || !user.planType) {
				return
			}

			// Check if this is a renewal (not the first invoice)
			// If the subscription was created recently, skip (already handled by checkout.session.completed)
			const subscription = await stripeService.getSubscription(subscriptionId)
			if (!subscription) {
				return
			}

			// Only add credits for renewals (not initial payment)
			// Initial payment is handled by checkout.session.completed
			const subscriptionAge = Date.now() - subscription.created * 1000
			if (subscriptionAge < 60000) {
				// Less than 1 minute old, likely initial payment
				return
			}

			const creditsToAdd = user.planType === PLAN_TYPES.BASIC ? PLAN_CREDITS.BASIC : PLAN_CREDITS.PRO

			await creditService.addCredits(user.id, creditsToAdd)

			logger.info('Credits added for subscription renewal', {
				userId: user.id,
				planType: user.planType,
				creditsAdded: creditsToAdd,
				invoiceId: invoice.id
			})
		}
	} catch (error) {
		logger.error('Error handling invoice.paid', error, { invoiceId: invoice.id })
		throw error
	}
}
