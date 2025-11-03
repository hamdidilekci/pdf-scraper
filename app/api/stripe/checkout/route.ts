import { NextRequest } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/middleware/auth-middleware'
import { badRequest, serverError, unauthorized } from '@/lib/api-errors'
import { success } from '@/lib/api-response'
import { StripeService } from '@/lib/services/stripe.service'
import { config } from '@/lib/config'
import { logger } from '@/lib/logger'
import { PLAN_TYPES } from '@/lib/constants'
import prisma from '@/lib/prisma'
import { z } from 'zod'

export const runtime = 'nodejs'

const schema = z.object({
	planType: z.enum(['BASIC', 'PRO'])
})

export async function POST(request: NextRequest) {
	try {
		const userId = await requireAuthenticatedUser()

		// Check if Stripe is configured
		if (!config.stripe.secretKey) {
			throw serverError('Payment service is not configured. Please contact support.')
		}

		const body = await request.json().catch(() => ({}))
		const parsed = schema.safeParse(body)

		if (!parsed.success) {
			throw badRequest('Please select a valid plan type (BASIC or PRO)')
		}

		const { planType } = parsed.data

		// Get price ID based on plan type
		const priceId = planType === PLAN_TYPES.BASIC ? config.stripe.priceBasic : config.stripe.pricePro

		if (!priceId) {
			throw serverError('Payment plan configuration is missing. Please contact support.')
		}

		// Get user data
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { email: true, stripeCustomerId: true, planType: true }
		})

		if (!user || !user.email) {
			throw serverError('Could not find your account information. Please try again.')
		}

		// Prevent downgrade from PRO to BASIC
		if (user.planType === PLAN_TYPES.PRO && planType === PLAN_TYPES.BASIC) {
			throw badRequest('You cannot downgrade from Pro to Basic plan. Please use the billing portal to manage your subscription.')
		}

		const stripeService = new StripeService()

		// Get or create Stripe customer
		const customer = await stripeService.getOrCreateCustomer(user.email, userId, user.stripeCustomerId)

		// Create checkout session
		const session = await stripeService.createCheckoutSession(customer.id, priceId, userId, planType)

		return success({ url: session.url })
	} catch (error) {
		if (error instanceof Error && error.message === 'Unauthorized') {
			throw unauthorized()
		}

		if (error instanceof Error && error.message.includes('Stripe is not configured')) {
			throw serverError('Payment service is not configured. Please contact support.')
		}

		logger.error('Checkout session creation error', error, { endpoint: '/api/stripe/checkout' })
		throw serverError('We could not create the checkout session. Please try again')
	}
}
