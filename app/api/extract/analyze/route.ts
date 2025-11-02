import { requireAuthenticatedUser } from '@/lib/middleware/auth-middleware'
import { badRequest, serverError, unauthorized } from '@/lib/api-errors'
import { success } from '@/lib/api-response'
import { StorageService } from '@/lib/services/storage.service'
import { ExtractionService } from '@/lib/services/extraction.service'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

type Body = {
	storagePath?: string
}

/**
 * POST /api/extract/analyze
 * Analyzes a PDF to determine the best extraction strategy without performing extraction
 */
export async function POST(req: Request) {
	try {
		const userId = await requireAuthenticatedUser()

		const body = (await req.json()) as Body
		const storagePath = body?.storagePath

		if (!storagePath) {
			throw badRequest('Resume file information is missing. Please try uploading again')
		}

		const storageService = new StorageService()
		const extractionService = new ExtractionService()

		// Download PDF
		const pdfArrayBuffer = await storageService.downloadFile(storagePath)

		// Analyze PDF
		const analysisResult = await extractionService.analyzePDF(pdfArrayBuffer)

		// Get available strategies
		const availableStrategies = extractionService.getAvailableStrategies()

		logger.info('PDF analysis completed', {
			userId,
			storagePath,
			contentType: analysisResult.contentType,
			recommendedStrategy: analysisResult.recommendedStrategy
		})

		return success({
			analysis: analysisResult,
			availableStrategies,
			recommendation: {
				strategyId: analysisResult.recommendedStrategy,
				confidence: analysisResult.textContentRatio > 0.8 ? 'high' :
							analysisResult.textContentRatio > 0.5 ? 'medium' : 'low'
			}
		})

	} catch (error) {
		if (error instanceof Error && error.message === 'Unauthorized') {
			throw unauthorized()
		}

		logger.error('PDF analysis error', error, { endpoint: '/api/extract/analyze' })

		let userMessage = 'We could not analyze your PDF file. Please try again'
		if (error instanceof Error) {
			if (error.message.includes('download') || error.message.includes('Failed to download')) {
				userMessage = 'We could not access your uploaded file. Please try uploading again'
			}
		}

		throw serverError(userMessage)
	}
}