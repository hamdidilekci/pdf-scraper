import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/middleware/auth-middleware'
import { serverError } from '@/lib/api-errors'
import { success } from '@/lib/api-response'
import { ResumeService } from '@/lib/services/resume.service'
import { logger } from '@/lib/logger'

export async function GET() {
	try {
		const userId = await requireAuthenticatedUser()

		const resumeService = new ResumeService()
		const stats = await resumeService.getDashboardStats(userId)

		return success(stats)
	} catch (error) {
		if (error instanceof Error && error.message === 'Unauthorized') {
			const { unauthorized } = await import('@/lib/api-errors')
			return unauthorized()
		}

		logger.error('Dashboard API error', error, { endpoint: '/api/dashboard' })
		return serverError('We could not load your dashboard statistics. Please refresh the page')
	}
}