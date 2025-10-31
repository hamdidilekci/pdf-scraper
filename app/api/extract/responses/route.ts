import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/middleware/auth-middleware'
import { badRequest, notFound, serverError } from '@/lib/api-errors'
import { success } from '@/lib/api-response'
import { StorageService } from '@/lib/services/storage.service'
import { ResumeService } from '@/lib/services/resume.service'
import { ExtractionService } from '@/lib/services/extraction.service'
import { config } from '@/lib/config'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

type Body = {
	storagePath?: string
	model?: string
}

export async function POST(req: Request) {
	try {
		const userId = await requireAuthenticatedUser()

		const body = (await req.json()) as Body
		const storagePath = body?.storagePath
		const requestedModel = (body?.model || config.openai.model).trim()

		if (!storagePath) {
			return badRequest('Resume file information is missing. Please try uploading again')
		}

		const resumeService = new ResumeService()
		const storageService = new StorageService()

		// Find resume
		const resume = await resumeService.findByStoragePath(storagePath, userId)
		if (!resume) {
			return notFound('The resume you are trying to process could not be found. Please try uploading again')
		}

		// Download PDF
		const pdfArrayBuffer = await storageService.downloadFile(storagePath)

		// Extract resume data
		const extractionService = new ExtractionService()
		const result = await extractionService.extractResume({
			resumeId: resume.id,
			pdfArrayBuffer,
			fileName: resume.fileName,
			model: requestedModel
		})

		return success({ resumeId: result.resumeId })
	} catch (error) {
		if (error instanceof Error && error.message === 'Unauthorized') {
			const { unauthorized } = await import('@/lib/api-errors')
			return unauthorized()
		}

		logger.error('Resume extraction error', error, { endpoint: '/api/extract/responses' })

		// Provide user-friendly error messages
		let userMessage = 'We could not extract information from your resume. Please try again'
		if (error instanceof Error) {
			if (error.message.includes('Unauthorized')) {
				userMessage = 'Please sign in to continue'
			} else if (error.message.includes('download') || error.message.includes('Failed to download')) {
				userMessage = 'We could not access your uploaded file. Please try uploading again'
			} else if (error.message.includes('OpenAI')) {
				userMessage = 'We encountered an issue processing your resume with AI. Please try again in a moment'
			} else if (error.message.includes('Schema validation')) {
				userMessage = 'We could not extract all required information from your resume. Please ensure your resume is clear and readable'
			}
		}

		return serverError(userMessage)
	}
}