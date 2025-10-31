import Stripe from 'stripe'
import { config } from '@/lib/config'
import { logger } from '@/lib/logger'
import prisma from '@/lib/prisma'

// Initialize Stripe client only if configured
const stripe = config.stripe.secretKey ? new Stripe(config.stripe.secretKey, { apiVersion: '2024-11-20.acacia' }) : null

export class StripeService {
	/**
	 * Check if Stripe is configured
	 */
	private isConfigured(): boolean {
		return !!stripe && !!config.stripe.secretKey
	}

	/**
	 * Create a Stripe customer
	 */
	async createCustomer(email: string, userId: string): Promise<Stripe.Customer> {
		if (!this.isConfigured()) {
			throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.')
		}

		try {
			const customer = await stripe!.customers.create({
				email,
				metadata: {
					userId
				}
			})

			// Update user with Stripe customer ID
			await prisma.user.update({
				where: { id: userId },
				data: { stripeCustomerId: customer.id }
			})

			logger.info('Stripe customer created', { userId, customerId: customer.id })
			return customer
		} catch (error) {
			logger.error('Error creating Stripe customer', error, { email, userId })
			throw error
		}
	}

	/**
	 * Get or create a Stripe customer for user
	 */
	async getOrCreateCustomer(email: string, userId: string, existingCustomerId?: string | null): Promise<Stripe.Customer> {
		if (!this.isConfigured()) {
			throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.')
		}

		try {
			// If user already has a customer ID, fetch it
			if (existingCustomerId) {
				const customer = await stripe!.customers.retrieve(existingCustomerId)
				if (!customer.deleted) {
					return customer as Stripe.Customer
				}
				// If customer was deleted, create a new one
			}

			// Create new customer
			return await this.createCustomer(email, userId)
		} catch (error) {
			logger.error('Error getting or creating Stripe customer', error, { email, userId, existingCustomerId })
			throw error
		}
	}

	/**
	 * Create a checkout session
	 */
	async createCheckoutSession(customerId: string, priceId: string, userId: string): Promise<Stripe.Checkout.Session> {
		if (!this.isConfigured()) {
			throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.')
		}

		try {
			const session = await stripe!.checkout.sessions.create({
				customer: customerId,
				mode: 'subscription',
				line_items: [
					{
						price: priceId,
						quantity: 1
					}
				],
				success_url: `${config.nextAuth.url}/settings?success=true`,
				cancel_url: `${config.nextAuth.url}/settings?canceled=true`,
				metadata: {
					userId
				}
			})

			logger.info('Checkout session created', { userId, sessionId: session.id, priceId })
			return session
		} catch (error) {
			logger.error('Error creating checkout session', error, { customerId, priceId, userId })
			throw error
		}
	}

	/**
	 * Create a customer portal session
	 */
	async createPortalSession(customerId: string, userId: string): Promise<Stripe.BillingPortal.Session> {
		if (!this.isConfigured()) {
			throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.')
		}

		try {
			const session = await stripe!.billingPortal.sessions.create({
				customer: customerId,
				return_url: `${config.nextAuth.url}/settings`
			})

			logger.info('Portal session created', { userId, sessionId: session.id })
			return session
		} catch (error) {
			logger.error('Error creating portal session', error, { customerId, userId })
			throw error
		}
	}

	/**
	 * Get subscription details
	 */
	async getSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
		if (!this.isConfigured()) {
			return null
		}

		try {
			const subscription = await stripe!.subscriptions.retrieve(subscriptionId)
			return subscription
		} catch (error) {
			logger.error('Error getting subscription', error, { subscriptionId })
			return null
		}
	}

	/**
	 * Get customer details
	 */
	async getCustomer(customerId: string): Promise<Stripe.Customer | null> {
		if (!this.isConfigured()) {
			return null
		}

		try {
			const customer = await stripe!.customers.retrieve(customerId)
			if (customer.deleted) {
				return null
			}
			return customer as Stripe.Customer
		} catch (error) {
			logger.error('Error getting customer', error, { customerId })
			return null
		}
	}

	/**
	 * Construct webhook event from raw body and signature
	 */
	constructWebhookEvent(payload: string | Buffer, signature: string): Stripe.Event {
		if (!this.isConfigured() || !config.stripe.webhookSecret) {
			throw new Error('Stripe webhook secret is not configured.')
		}

		try {
			return stripe!.webhooks.constructEvent(payload, signature, config.stripe.webhookSecret)
		} catch (error) {
			logger.error('Error constructing webhook event', error)
			throw error
		}
	}
}
