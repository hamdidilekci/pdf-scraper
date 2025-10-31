import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/middleware/auth-middleware'
import { notFound, serverError } from '@/lib/api-errors'
import { success } from '@/lib/api-response'
import { ResumeService } from '@/lib/services/resume.service'
import { logger } from '@/lib/logger'

type Params = { params: { id: string } }

export async function GET(_: Request, { params }: Params) {
	try {
		const userId = await requireAuthenticatedUser()

		const resumeService = new ResumeService()
		const item = await resumeService.findById(params.id, userId)

		if (!item) {
			return notFound('This resume could not be found or you do not have permission to view it')
		}

		return success({ item })
	} catch (error) {
		if (error instanceof Error && error.message === 'Unauthorized') {
			const { unauthorized } = await import('@/lib/api-errors')
			return unauthorized()
		}

		logger.error('Get resume error', error, { endpoint: '/api/resumes/[id]', resumeId: params.id })
		return serverError('We could not load this resume. Please try again')
	}
}