import { requireAuthenticatedUser } from '@/lib/middleware/auth-middleware'
import { serverError, unauthorized } from '@/lib/api-errors'
import { success } from '@/lib/api-response'
import { logger } from '@/lib/logger'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
	try {
		const userId = await requireAuthenticatedUser()

		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				email: true,
				credits: true,
				planType: true,
				stripeCustomerId: true,
				stripeSubscriptionId: true
			}
		})

		if (!user) {
			throw serverError('Could not find your account information. Please try again.')
		}

		return success({
			credits: user.credits,
			planType: user.planType,
			hasStripeCustomer: !!user.stripeCustomerId,
			hasSubscription: !!user.stripeSubscriptionId
		})
	} catch (error) {
		if (error instanceof Error && error.message === 'Unauthorized') {
			throw unauthorized()
		}

		logger.error('User API error', error, { endpoint: '/api/user' })
		throw serverError('We could not load your account information. Please refresh the page')
	}
}
