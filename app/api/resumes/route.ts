import { requireAuthenticatedUser } from '@/lib/middleware/auth-middleware'
import { serverError, unauthorized } from '@/lib/api-errors'
import { success } from '@/lib/api-response'
import { ResumeService } from '@/lib/services/resume.service'
import { logger } from '@/lib/logger'

export async function GET(req: Request) {
	try {
		const userId = await requireAuthenticatedUser()

		const { searchParams } = new URL(req.url)
		const status = searchParams.get('status') || undefined
		const search = searchParams.get('search') || undefined
		const limit = parseInt(searchParams.get('limit') || '20', 10)

		const resumeService = new ResumeService()
		const result = await resumeService.list({
			userId,
			status,
			search,
			limit
		})

		return success(result)
	} catch (error) {
		if (error instanceof Error && error.message === 'Unauthorized') {
			throw unauthorized()
		}

		logger.error('List resumes error', error, { endpoint: '/api/resumes' })
		throw serverError('We could not load your resumes. Please refresh the page')
	}
}
