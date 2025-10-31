import { requireAuthenticatedUser } from '@/lib/middleware/auth-middleware'
import { badRequest, serverError } from '@/lib/api-errors'
import { success } from '@/lib/api-response'
import { StorageService } from '@/lib/services/storage.service'
import { ResumeService } from '@/lib/services/resume.service'
import { logger } from '@/lib/logger'

type Body = {
	fileName?: string
	contentType?: string
	action?: string
	storagePath?: string
}

export async function POST(req: Request) {
	try {
		const userId = await requireAuthenticatedUser()

		const body = (await req.json()) as Body
		const { fileName, contentType = 'application/pdf', action = 'upload', storagePath } = body

		if (!fileName) {
			return badRequest('Please select a file to upload')
		}

		const storageService = new StorageService()

		// Handle download requests
		if (action === 'download' && storagePath) {
			const result = await storageService.createDownloadUrl({ storagePath })
			return success({ signedUrl: result.signedUrl })
		}

		// Handle upload requests
		const result = await storageService.createUploadUrl({
			userId,
			fileName,
			contentType
		})

		// Create resume record
		const resumeService = new ResumeService()
		try {
			await resumeService.create({
				userId,
				fileName,
				storagePath: result.storagePath
			})
		} catch (dbError) {
			logger.warn('Failed to create resume record (continuing)', {
				userId,
				fileName,
				storagePath: result.storagePath,
				error: dbError instanceof Error ? dbError.message : String(dbError)
			})
			// Continue with upload even if DB fails
		}

		return success({
			bucket: result.bucket,
			storagePath: result.storagePath,
			signedUrl: result.signedUrl,
			token: result.token,
			contentType: result.contentType
		})
	} catch (error) {
		if (error instanceof Error && error.message === 'Unauthorized') {
			const { unauthorized } = await import('@/lib/api-errors')
			return unauthorized()
		}

		logger.error('Storage signed URL error', error, { endpoint: '/api/storage/signed-url' })

		// Provide user-friendly error messages
		let userMessage = 'We could not prepare your file for upload. Please try again'
		if (error instanceof Error) {
			if (error.message.includes('Unauthorized')) {
				userMessage = 'Please sign in to upload files'
			} else if (error.message.includes('Bucket')) {
				userMessage = 'Our storage system is unavailable. Please try again later'
			}
		}

		return serverError(userMessage)
	}
}
