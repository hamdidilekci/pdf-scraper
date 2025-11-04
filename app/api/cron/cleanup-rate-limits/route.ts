import { NextResponse } from 'next/server'
import { RateLimitService } from '@/lib/services/rate-limit.service'
import { OTPService } from '@/lib/services/otp.service'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * Cleanup endpoint for rate limits and OTPs
 * Should be called periodically via a cron job
 *
 * Example cron setup (Vercel):
 * vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/cleanup-rate-limits",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 */
export async function GET(request: Request) {
	try {
		// Verify the request is from Vercel Cron or has valid authorization
		const authHeader = request.headers.get('authorization')
		const cronSecret = process.env.CRON_SECRET
		const isVercelCron = request.headers.get('x-vercel-cron') === '1'

		// Allow if it's from Vercel Cron or has valid secret
		const hasValidToken = cronSecret && authHeader === `Bearer ${cronSecret}`
		const isAuthorized = isVercelCron || hasValidToken

		// Require authentication unless in development without CRON_SECRET
		const isDevelopment = process.env.NODE_ENV === 'development'
		const requireAuth = cronSecret || !isDevelopment

		if (requireAuth && !isAuthorized) {
			logger.warn('Unauthorized cron request', {
				hasAuthHeader: !!authHeader,
				isVercelCron,
				hasCronSecret: !!cronSecret,
				isDevelopment
			})
			return NextResponse.json(
				{
					error: 'Unauthorized',
					message: 'This endpoint requires authentication. Set CRON_SECRET environment variable.'
				},
				{ status: 401 }
			)
		}

		// Cleanup rate limits
		const rateLimitService = new RateLimitService()
		await rateLimitService.cleanup()

		// Cleanup expired OTPs
		const otpService = new OTPService()
		await otpService.cleanupExpiredOTPs()

		logger.info('Cron cleanup completed successfully')

		return NextResponse.json({
			success: true,
			message: 'Cleanup completed successfully',
			timestamp: new Date().toISOString()
		})
	} catch (error) {
		logger.error('Cron cleanup failed', error)
		return NextResponse.json(
			{
				error: 'Cleanup failed',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		)
	}
}
