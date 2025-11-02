import { requireAuthenticatedUser } from '@/lib/middleware/auth-middleware'
import { notFound, serverError, unauthorized } from '@/lib/api-errors'
import { success } from '@/lib/api-response'
import { ResumeService } from '@/lib/services/resume.service'
import { StorageService } from '@/lib/services/storage.service'
import { logger } from '@/lib/logger'

type Params = { params: { id: string } }

export async function GET(_: Request, { params }: Params) {
	try {
		const userId = await requireAuthenticatedUser()

		const resumeService = new ResumeService()
		const item = await resumeService.findById(params.id, userId)

		if (!item) {
			throw notFound('This resume could not be found or you do not have permission to view it')
		}

		return success({ item })
	} catch (error) {
		if (error instanceof Error && error.message === 'Unauthorized') {
			throw unauthorized()
		}

		logger.error('Get resume error', error, { endpoint: '/api/resumes/[id]', resumeId: params.id })
		throw serverError('We could not load this resume. Please try again')
	}
}

export async function DELETE(_: Request, { params }: Params) {
	try {
		const userId = await requireAuthenticatedUser()

		const resumeService = new ResumeService()
		const storageService = new StorageService()

		// Delete resume and get storage path
		const { storagePath } = await resumeService.delete(params.id, userId)

		// Delete file from storage (optional - don't fail if file doesn't exist)
		try {
			await storageService.deleteFile(storagePath)
		} catch (error) {
			logger.warn('Failed to delete file from storage (continuing)', {
				resumeId: params.id,
				storagePath,
				error: error instanceof Error ? error.message : String(error)
			})
			// Continue even if file deletion fails
		}

		return success({ message: 'Resume deleted successfully' })
	} catch (error) {
		if (error instanceof Error && error.message === 'Unauthorized') {
			throw unauthorized()
		}

		if (error instanceof Error && error.message.includes('not found')) {
			logger.warn('Delete resume error - Resume not found', { endpoint: '/api/resumes/[id]', resumeId: params.id })
			throw notFound(error.message)
		}

		logger.error('Delete resume error', error, { endpoint: '/api/resumes/[id]', resumeId: params.id })
		throw serverError('We could not delete this resume. Please try again')
	}
}
