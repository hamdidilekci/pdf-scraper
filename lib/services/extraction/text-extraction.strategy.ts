import {
	ExtractionStrategy,
	ExtractResumeParams,
	ExtractionResult,
	ExtractionMetadata,
	PDFAnalysisResult,
	PDFContentType
} from './types'
import { OpenAIService } from '@/lib/services/openai.service'
import { extractionSystemPrompt } from '@/lib/prompt'
import { resumeJsonSchema, type ResumeJson } from '@/lib/types'
import { normalizeResume } from '@/lib/normalizeResume'
import { logger } from '@/lib/logger'
import prisma from '@/lib/prisma'

/**
 * Text-based extraction strategy for PDFs with readable text content
 * Uses OpenAI's file processing API to extract structured data from text-based PDFs
 */
export class TextExtractionStrategy implements ExtractionStrategy {
	readonly strategyId = 'text-extraction'
	readonly displayName = 'Text-based PDF Extraction'

	private openaiService: OpenAIService

	constructor() {
		this.openaiService = new OpenAIService()
	}

	canHandle(analysisResult: PDFAnalysisResult): boolean {
		// This strategy works best with text-based PDFs
		return analysisResult.contentType === PDFContentType.TEXT_BASED ||
			   (analysisResult.contentType === PDFContentType.MIXED && analysisResult.textContentRatio > 0.7) ||
			   analysisResult.hasText
	}

	async extract(params: ExtractResumeParams): Promise<ExtractionResult> {
		const { resumeId, pdfArrayBuffer, fileName, model } = params

		// Create history record
		const history = await prisma.resumeHistory.create({
			data: {
				resumeId,
				inputType: 'TEXT',
				model,
				status: 'PENDING'
			}
		})

		try {
			logger.info('Starting text-based extraction', { resumeId, fileName, model })

			// Upload file and get AI response
			const uploadResult = await this.openaiService.uploadFile(pdfArrayBuffer, fileName)

			let extractedJson: any
			let rawResponse: any

			try {
				// Process with AI
				const responseResult = await this.openaiService.callResponsesAPI({
					fileId: uploadResult.fileId,
					model,
					prompt: extractionSystemPrompt,
					temperature: 0
				})

				rawResponse = responseResult.rawResponse

				// Try to parse JSON with retry logic
				extractedJson = await this.openaiService.parseJsonWithRetry(
					uploadResult.fileId,
					model,
					rawResponse,
					extractionSystemPrompt
				)

			} finally {
				// Clean up the uploaded file
				await this.openaiService.deleteFile(uploadResult.fileId)
			}

			// Normalize and validate the extracted data
			const normalized = normalizeResume(extractedJson)
			const validated = resumeJsonSchema.safeParse(normalized)

			if (!validated.success) {
				const validationError = 'Could not extract all required information from your resume. Please ensure your resume contains clear, readable text.'
				await this.markFailed(resumeId, history.id, normalized, rawResponse, validationError)
				throw new Error(validationError)
			}

			// Update database with success
			await prisma.resume.update({
				where: { id: resumeId },
				data: {
					status: 'COMPLETED',
					resumeData: validated.data,
					error: null
				}
			})

			await prisma.resumeHistory.update({
				where: { id: history.id },
				data: {
					status: 'COMPLETED',
					rawResponse: rawResponse
				}
			})

			logger.info('Text-based extraction completed successfully', { resumeId })

			return {
				resumeId,
				historyId: history.id,
				resumeData: validated.data
			}

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			await this.markFailed(resumeId, history.id, null, null, errorMessage)

			logger.error('Text-based extraction failed', error, { resumeId, fileName })
			throw error
		}
	}

	getMetadata(): ExtractionMetadata {
		return {
			inputType: 'TEXT',
			processingMethod: 'openai-file-api',
			confidence: 0.9, // Text extraction typically has high confidence
			additionalInfo: {
				strategy: this.strategyId,
				usesOCR: false,
				requiresTextContent: true
			}
		}
	}

	private async markFailed(
		resumeId: string,
		historyId: string,
		resumeData: any,
		rawResponse: any,
		errorMessage: string
	): Promise<void> {
		const resumeUpdateData: any = {
			status: 'FAILED',
			error: errorMessage
		}
		if (resumeData !== null && resumeData !== undefined) {
			resumeUpdateData.resumeData = resumeData
		}

		const historyUpdateData: any = {
			status: 'FAILED',
			error: errorMessage.slice(0, 1000)
		}
		if (rawResponse !== null && rawResponse !== undefined) {
			historyUpdateData.rawResponse = typeof rawResponse === 'string'
				? rawResponse.slice(0, 2000)
				: JSON.stringify(rawResponse).slice(0, 2000)
		}

		await Promise.all([
			prisma.resume.update({
				where: { id: resumeId },
				data: resumeUpdateData
			}),
			prisma.resumeHistory.update({
				where: { id: historyId },
				data: historyUpdateData
			})
		])
	}
}