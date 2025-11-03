import { config } from '@/lib/config'
import {
	OPENAI_FILES_URL,
	OPENAI_RESPONSES_URL,
	OPENAI_CHAT_COMPLETIONS_URL,
	OPENAI_FILE_PURPOSE,
	DEFAULT_FILE_NAME,
	VISION_MODEL
} from '@/lib/constants'
import { extractionSystemPrompt, createVisionPrompt } from '@/lib/prompt'
import { resumeJsonSchema, type ResumeJson } from '@/lib/types'
import { normalizeResume } from '@/lib/normalizeResume'
import { logger } from '@/lib/logger'
import prisma from '@/lib/prisma'
import { InputType } from '@prisma/client'
import { SimplePDFAnalyzer } from './extraction/pdf-analyzer'
import { type ExtractResumeParams, type ExtractionResult } from './extraction/types'
import { PdfToImageService, PdfImageResult } from './pdf-to-image.service'

export class ExtractionService {
	private apiKey: string
	private pdfAnalyzer: SimplePDFAnalyzer
	private pdfToImageService: PdfToImageService

	constructor() {
		this.apiKey = config.openai.apiKey
		this.pdfAnalyzer = new SimplePDFAnalyzer()
		this.pdfToImageService = new PdfToImageService()
	}

	async extractResume(params: ExtractResumeParams): Promise<ExtractionResult> {
		const { resumeId, pdfArrayBuffer, fileName, model } = params

		// Step 0: Analyze PDF to determine content type
		const analysisResult = await this.pdfAnalyzer.analyze(pdfArrayBuffer)

		// Determine pipeline based on analyzer recommendation
		const useVisionPipeline = analysisResult.recommendedStrategy === 'image-extraction'
		const inputType: InputType = useVisionPipeline ? 'IMAGES' : 'TEXT'

		logger.info('PDF analysis result', {
			resumeId,
			contentType: analysisResult.contentType,
			inputType,
			recommendedStrategy: analysisResult.recommendedStrategy
		})

		// Create history record with determined inputType
		const history = await prisma.resumeHistory.create({
			data: {
				resumeId,
				inputType,
				model,
				status: 'PENDING'
			}
		})

		try {
			// Step 2: Determine extraction flow based on PDF type
			let validated: any
			let rawResponse: any
			if (!useVisionPipeline) {
				// Text-based PDFs: single-pass extraction using Responses API
				// Step 1: Upload PDF to OpenAI Files API
				const fileId = await this.uploadToOpenAI(pdfArrayBuffer, fileName)
				rawResponse = await this.callResponsesAPI(fileId, model)
				const json = await this.extractJsonFromResponse(rawResponse, fileId, model)
				const normalized = normalizeResume(json)
				validated = resumeJsonSchema.safeParse(normalized)

				if (!validated.success) {
					const validationError =
						'We could not extract all required information from your resume. Please ensure your resume is clear and contains the necessary details'
					await this.markFailed(resumeId, history.id, normalized, rawResponse, validationError)
					throw new Error(validationError)
				}
			} else {
				// Image-based, hybrid, or scanned PDFs: Vision API pipeline
				// Step 1: Convert PDF pages to images
				logger.info('Converting PDF to images for Vision API extraction', { resumeId })
				const images = await this.pdfToImageService.convertToImages(pdfArrayBuffer)

				if (images.length === 0) {
					throw new Error('Failed to convert PDF pages to images. Please ensure the PDF is valid.')
				}

				logger.info('PDF converted to images', {
					resumeId,
					pageCount: images.length
				})

				// Step 2: Extract using Vision API
				const result = await this.extractWithVisionAPI(images)
				validated = result.validated
				rawResponse = result.rawResponse

				if (!validated.success) {
					const validationError =
						'We could not extract all required information from your resume. Please ensure your resume is clear and contains the necessary details'
					// When validation fails, we don't have validated.data, so pass null for resumeData
					await this.markFailed(resumeId, history.id, null, rawResponse, validationError)
					throw new Error(validationError)
				}
			}

			// Step 3: Persist success
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

			return {
				resumeId,
				historyId: history.id,
				resumeData: validated.data
			}
		} catch (error) {
			await this.markFailed(resumeId, history.id, null, null, error instanceof Error ? error.message : String(error))
			throw error
		}
	}

	private async uploadToOpenAI(pdfArrayBuffer: ArrayBuffer, fileName: string): Promise<string> {
		const filesForm = new FormData()
		const safeFileName = fileName || DEFAULT_FILE_NAME
		filesForm.append('purpose', OPENAI_FILE_PURPOSE)
		filesForm.append('file', new Blob([pdfArrayBuffer], { type: 'application/pdf' }), safeFileName)

		const response = await fetch(OPENAI_FILES_URL, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.apiKey}`
			},
			body: filesForm
		})

		const raw = await response.text()

		if (!response.ok) {
			logger.error('OpenAI Files API error', new Error(raw), { status: response.status })
			throw new Error('Unable to process your resume file. Please try again')
		}

		let fileId: string = ''
		try {
			const json = JSON.parse(raw)
			fileId = json?.id || ''
		} catch {
			logger.error('Failed to parse OpenAI Files API response', undefined, { raw: raw.slice(0, 200) })
			throw new Error('Failed to parse OpenAI Files API response')
		}

		if (!fileId) {
			logger.error('Failed to obtain file ID from OpenAI', undefined, { raw: raw.slice(0, 200) })
			throw new Error('Unable to prepare your resume for processing. Please try again')
		}

		return fileId
	}

	private async callResponsesAPI(fileId: string, model: string): Promise<any> {
		const responsesBody = {
			model,
			temperature: 0,
			text: { format: { type: 'json_object' } },
			input: [
				{
					role: 'user',
					content: [
						{ type: 'input_text', text: extractionSystemPrompt },
						{ type: 'input_file', file_id: fileId }
					]
				}
			]
		}

		const response = await fetch(OPENAI_RESPONSES_URL, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(responsesBody)
		})

		const raw = await response.text()

		if (!response.ok) {
			logger.error('OpenAI Responses API error', new Error(raw), { status: response.status })
			throw new Error('Unable to analyze your resume. Please try again')
		}

		let parsed: any
		try {
			parsed = JSON.parse(raw)
		} catch {
			parsed = { raw }
		}

		return parsed
	}

	private async extractJsonFromResponse(parsedResponse: any, fileId: string, model: string): Promise<any> {
		// Extract output text using heuristics
		let outputText = ''
		if (parsedResponse?.output_text) {
			outputText = parsedResponse.output_text
		} else if (Array.isArray(parsedResponse?.output)) {
			const firstText = parsedResponse.output.find((p: any) => p?.content?.[0]?.type === 'output_text')
			outputText = firstText?.content?.[0]?.text || ''
		}
		if (!outputText) {
			outputText = parsedResponse?.choices?.[0]?.message?.content || ''
		}

		// Try to parse JSON
		try {
			return JSON.parse(outputText)
		} catch {
			// Retry with enhanced prompt
			logger.warn('Initial JSON parse failed, retrying with enhanced prompt', { outputText: outputText.slice(0, 200) })
			return this.retryWithEnhancedPrompt(fileId, model)
		}
	}

	private async retryWithEnhancedPrompt(fileId: string, model: string): Promise<any> {
		const enhancedPrompt = `${extractionSystemPrompt}\nReturn ONLY a valid JSON object without markdown. If previous output was invalid, strictly follow the schema now.`

		const retryBody = {
			model,
			temperature: 0,
			text: { format: { type: 'json_object' } },
			input: [
				{
					role: 'user',
					content: [
						{ type: 'input_text', text: enhancedPrompt },
						{ type: 'input_file', file_id: fileId }
					]
				}
			]
		}

		const response = await fetch(OPENAI_RESPONSES_URL, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(retryBody)
		})

		const raw = await response.text()
		let parsed: any
		try {
			parsed = JSON.parse(raw)
		} catch {
			parsed = { raw }
		}

		let retryText = ''
		if (parsed?.output_text) retryText = parsed.output_text
		else if (Array.isArray(parsed?.output)) {
			const firstText = parsed.output.find((p: any) => p?.content?.[0]?.type === 'output_text')
			retryText = firstText?.content?.[0]?.text || ''
		}
		if (!retryText) retryText = parsed?.choices?.[0]?.message?.content || raw

		try {
			return JSON.parse(retryText)
		} catch {
			logger.error('Retry JSON parse also failed', undefined, { retryText: retryText.slice(0, 200) })
			throw new Error('We could not parse the extracted information. Please try again with a clearer resume')
		}
	}

	private async extractWithVisionAPI(images: PdfImageResult[]): Promise<{ validated: any; rawResponse: any }> {
		logger.info('Starting Vision API extraction', { imageCount: images.length })

		const pageResponses: any[] = []
		const totalPages = images.length

		// Process each image through Vision API
		for (const image of images) {
			try {
				logger.info('Processing page through Vision API', {
					pageNumber: image.pageNumber,
					totalPages
				})

				// Convert image buffer to base64
				const base64Image = image.buffer.toString('base64')

				// Create vision prompt for this page
				const visionPrompt = createVisionPrompt(image.pageNumber, totalPages)

				// Call OpenAI Vision API
				const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${this.apiKey}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						model: VISION_MODEL,
						messages: [
							{
								role: 'user',
								content: [
									{ type: 'text', text: visionPrompt },
									{
										type: 'image_url',
										image_url: {
											url: `data:image/png;base64,${base64Image}`
										}
									}
								]
							}
						],
						response_format: { type: 'json_object' },
						temperature: 0
					})
				})

				const raw = await response.text()

				if (!response.ok) {
					logger.warn('Vision API call failed for page', {
						pageNumber: image.pageNumber,
						status: response.status,
						error: raw.slice(0, 200)
					})
					continue // Skip this page, continue with others
				}

				let parsed: any
				try {
					parsed = JSON.parse(raw)
				} catch {
					logger.warn('Failed to parse Vision API response', { pageNumber: image.pageNumber })
					continue
				}

				// Extract JSON from response
				const content = parsed?.choices?.[0]?.message?.content || ''
				if (!content) {
					logger.warn('No content in Vision API response', { pageNumber: image.pageNumber })
					continue
				}

				let pageJson: any
				try {
					pageJson = JSON.parse(content)
				} catch (error) {
					logger.warn('Failed to parse JSON from Vision API response', {
						pageNumber: image.pageNumber,
						error: error instanceof Error ? error.message : String(error)
					})
					continue
				}

				pageResponses.push(pageJson)
				logger.info('Page processed successfully', { pageNumber: image.pageNumber })
			} catch (error) {
				logger.error('Error processing page through Vision API', error, {
					pageNumber: image.pageNumber
				})
				// Continue with other pages
			}
		}

		if (pageResponses.length === 0) {
			throw new Error('Failed to extract any data from PDF pages. Please ensure the PDF is readable.')
		}

		logger.info('All pages processed, merging responses', {
			totalPages: pageResponses.length,
			processedPages: pageResponses.length
		})

		// Merge all page responses
		const mergedJson = this.mergePageResponses(pageResponses)
		const normalized = normalizeResume(mergedJson)
		const validated = resumeJsonSchema.safeParse(normalized)

		logger.info('Vision API extraction completed', {
			success: validated.success,
			pagesProcessed: pageResponses.length
		})

		return { validated, rawResponse: { pages: pageResponses, merged: mergedJson } }
	}

	private mergePageResponses(pageResponses: any[]): ResumeJson {
		if (pageResponses.length === 0) {
			throw new Error('No page responses to merge')
		}

		if (pageResponses.length === 1) {
			return normalizeResume(pageResponses[0])
		}

		logger.info('Merging page responses', { pageCount: pageResponses.length })

		// Start with first page as base
		const merged: any = { ...normalizeResume(pageResponses[0]) }

		// Merge profile - prefer non-empty values
		for (let i = 1; i < pageResponses.length; i++) {
			const pageData = normalizeResume(pageResponses[i])
			if (pageData.profile) {
				Object.keys(pageData.profile).forEach((key) => {
					const typedKey = key as keyof typeof pageData.profile
					const currentValue = merged.profile[typedKey]
					const newValue = pageData.profile[typedKey]

					// Prefer non-empty string values
					if (
						typeof newValue === 'string' &&
						newValue.trim() !== '' &&
						(!currentValue || (typeof currentValue === 'string' && currentValue.trim() === ''))
					) {
						merged.profile[typedKey] = newValue
					}
				})
			}
		}

		// Merge arrays - combine and deduplicate
		const arrayFields: (keyof ResumeJson)[] = [
			'workExperiences',
			'educations',
			'skills',
			'licenses',
			'languages',
			'achievements',
			'publications',
			'honors'
		] as const

		for (const field of arrayFields) {
			const allItems: any[] = [...(merged[field] || [])]

			// Collect items from all pages
			for (let i = 1; i < pageResponses.length; i++) {
				const pageData = normalizeResume(pageResponses[i])
				if (pageData[field] && Array.isArray(pageData[field])) {
					allItems.push(...(pageData[field] as any[]))
				}
			}

			// Deduplicate based on key fields
			if (field === 'workExperiences') {
				merged[field] = this.deduplicateWorkExperiences(allItems)
			} else if (field === 'educations') {
				merged[field] = this.deduplicateEducations(allItems)
			} else if (field === 'skills') {
				merged[field] = [...new Set(allItems.map((s) => s.toLowerCase().trim()))].filter((s) => s !== '')
			} else if (field === 'languages') {
				merged[field] = this.deduplicateLanguages(allItems)
			} else {
				// For other arrays, simple deduplication based on title/name
				if (allItems.length > 0) {
					const keyField = 'title' in allItems[0] ? 'title' : 'name'
					merged[field] = this.deduplicateByKey(allItems, keyField)
				} else {
					merged[field] = []
				}
			}
		}

		return merged as ResumeJson
	}

	private deduplicateWorkExperiences(experiences: any[]): any[] {
		const seen = new Map<string, any>()
		for (const exp of experiences) {
			const key = `${exp.company || ''}-${exp.jobTitle || ''}-${exp.startYear || ''}-${exp.startMonth || ''}`.toLowerCase()
			if (!seen.has(key) || (!exp.description && seen.get(key)?.description)) {
				seen.set(key, exp)
			}
		}
		return Array.from(seen.values())
	}

	private deduplicateEducations(educations: any[]): any[] {
		const seen = new Map<string, any>()
		for (const edu of educations) {
			const key = `${edu.school || ''}-${edu.degree || ''}-${edu.startYear || ''}`.toLowerCase()
			if (!seen.has(key) || (!edu.description && seen.get(key)?.description)) {
				seen.set(key, edu)
			}
		}
		return Array.from(seen.values())
	}

	private deduplicateLanguages(languages: any[]): any[] {
		const seen = new Map<string, any>()
		for (const lang of languages) {
			const key = (lang.language || '').toLowerCase()
			if (!seen.has(key) || (lang.level && !seen.get(key)?.level)) {
				seen.set(key, lang)
			}
		}
		return Array.from(seen.values())
	}

	private deduplicateByKey(items: any[], keyField: string): any[] {
		const seen = new Map<string, any>()
		for (const item of items) {
			const key = (item[keyField] || '').toLowerCase().trim()
			if (key && !seen.has(key)) {
				seen.set(key, item)
			}
		}
		return Array.from(seen.values())
	}

	private async markFailed(resumeId: string, historyId: string, resumeData: any, rawResponse: any, errorMessage: string): Promise<void> {
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
			historyUpdateData.rawResponse = typeof rawResponse === 'string' ? rawResponse.slice(0, 2000) : JSON.stringify(rawResponse).slice(0, 2000)
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
