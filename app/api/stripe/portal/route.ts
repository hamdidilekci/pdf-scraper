import { requireAuthenticatedUser } from '@/lib/middleware/auth-middleware'
import { badRequest, serverError, unauthorized } from '@/lib/api-errors'
import { success } from '@/lib/api-response'
import { StripeService } from '@/lib/services/stripe.service'
import { config } from '@/lib/config'
import { logger } from '@/lib/logger'
import prisma from '@/lib/prisma'

export const runtime = 'nodejs'

export async function POST() {
	try {
		const userId = await requireAuthenticatedUser()

		// Check if Stripe is configured
		if (!config.stripe.secretKey) {
			throw serverError('Payment service is not configured. Please contact support.')
		}

		// Get user's Stripe customer ID
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { stripeCustomerId: true }
		})

		if (!user) {
			throw serverError('Could not find your account information. Please try again.')
		}

		if (!user.stripeCustomerId) {
			throw badRequest('You do not have an active subscription. Please subscribe to a plan first.')
		}

		const stripeService = new StripeService()

		// Create portal session
		const session = await stripeService.createPortalSession(user.stripeCustomerId, userId)

		return success({ url: session.url })
	} catch (error) {
		if (error instanceof Error && error.message === 'Unauthorized') {
			throw unauthorized()
		}

		if (error instanceof Error && error.message.includes('Stripe is not configured')) {
			throw serverError('Payment service is not configured. Please contact support.')
		}

		logger.error('Portal session creation error', error, { endpoint: '/api/stripe/portal' })
		throw serverError('We could not create the billing portal session. Please try again')
	}
}
