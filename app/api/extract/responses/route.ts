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
			return badRequest('storagePath required')
		}

		const resumeService = new ResumeService()
		const storageService = new StorageService()

		// Find resume
		const resume = await resumeService.findByStoragePath(storagePath, userId)
		if (!resume) {
			return notFound('Resume not found')
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
		return serverError('Failed to extract resume', error instanceof Error ? error.message : undefined)
	}
}