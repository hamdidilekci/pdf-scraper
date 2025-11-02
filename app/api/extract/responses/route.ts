import { requireAuthenticatedUser } from '@/lib/middleware/auth-middleware'
import { badRequest, notFound, serverError, unauthorized } from '@/lib/api-errors'
import { success } from '@/lib/api-response'
import { StorageService } from '@/lib/services/storage.service'
import { ResumeService } from '@/lib/services/resume.service'
import { ExtractionService } from '@/lib/services/extraction.service'
import { CreditService } from '@/lib/services/credit.service'
import { logger } from '@/lib/logger'
import { CREDITS_PER_RESUME, DEFAULT_OPENAI_MODEL } from '@/lib/constants'

export const runtime = 'nodejs'

type Body = {
	storagePath?: string
}

export async function POST(req: Request) {
	try {
		const userId = await requireAuthenticatedUser()

		const body = (await req.json()) as Body
		const storagePath = body?.storagePath

		if (!storagePath) {
			throw badRequest('Resume file information is missing. Please try uploading again')
		}

		const resumeService = new ResumeService()
		const storageService = new StorageService()
		const creditService = new CreditService()

		// Check credits before extraction
		try {
			const hasCredits = await creditService.checkCredits(userId, CREDITS_PER_RESUME)
			if (!hasCredits) {
				throw badRequest(
					`You don't have enough credits. Each resume extraction costs ${CREDITS_PER_RESUME} credits. Please upgrade your plan or purchase more credits.`
				)
			}
		} catch (error) {
			// If credit service fails (e.g., Stripe not configured), log and continue
			// This allows the app to work without Stripe
			logger.warn('Credit check failed, proceeding without credit check', { error, userId })
		}

		// Find resume
		const resume = await resumeService.findByStoragePath(storagePath, userId)
		if (!resume) {
			throw notFound('The resume you are trying to process could not be found. Please try uploading again')
		}

		// Download PDF
		const pdfArrayBuffer = await storageService.downloadFile(storagePath)

		// Extract resume data using the new modular extraction system
		const extractionService = new ExtractionService()

		// Optional: You can now analyze the PDF first to see what strategy will be used
		// const analysisResult = await extractionService.analyzePDF(pdfArrayBuffer)
		// logger.info('PDF analysis preview', { analysisResult })

		const result = await extractionService.extractResume({
			resumeId: resume.id,
			pdfArrayBuffer,
			fileName: resume.fileName,
			model: DEFAULT_OPENAI_MODEL
		})

		// Deduct credits after successful extraction
		try {
			await creditService.deductCredits(userId, CREDITS_PER_RESUME)
			logger.info('Credits deducted after successful extraction', { userId, amount: CREDITS_PER_RESUME })
		} catch (error) {
			// Log error but don't fail the request since extraction already succeeded
			// In production, you might want to handle this differently (e.g., queue for retry)
			logger.error('Failed to deduct credits after extraction', error, { userId, amount: CREDITS_PER_RESUME })
		}

		return success({ resumeId: result.resumeId })
	} catch (error) {
		if (error instanceof Error && error.message === 'Unauthorized') {
			throw unauthorized()
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

		throw serverError(userMessage)
	}
}
