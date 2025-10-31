import { config } from '@/lib/config'
import { OPENAI_FILES_URL, OPENAI_RESPONSES_URL, OPENAI_FILE_PURPOSE, DEFAULT_FILE_NAME } from '@/lib/constants'
import { extractionSystemPrompt } from '@/lib/prompt'
import { resumeJsonSchema, type ResumeJson } from '@/lib/types'
import { normalizeResume } from '@/lib/normalizeResume'
import { logger } from '@/lib/logger'
import prisma from '@/lib/prisma'
import { Prisma, ResumeStatus, InputType } from '@prisma/client'

export interface ExtractResumeParams {
	resumeId: string
	pdfArrayBuffer: ArrayBuffer
	fileName: string
	model: string
}

export interface ExtractionResult {
	resumeId: string
	historyId: string
	resumeData: ResumeJson
}

export class ExtractionService {
	private apiKey: string

	constructor() {
		this.apiKey = config.openai.apiKey
	}

	async extractResume(params: ExtractResumeParams): Promise<ExtractionResult> {
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
			// Step 1: Upload PDF to OpenAI Files API
			const fileId = await this.uploadToOpenAI(pdfArrayBuffer, fileName)

			// Step 2: Call Responses API
			const rawResponse = await this.callResponsesAPI(fileId, model)

			// Step 3: Extract and parse JSON
			const json = await this.extractJsonFromResponse(rawResponse, fileId, model)

			// Step 4: Normalize and validate
			const normalized = normalizeResume(json)
			const validated = resumeJsonSchema.safeParse(normalized)

			if (!validated.success) {
				const validationError =
					'We could not extract all required information from your resume. Please ensure your resume is clear and contains the necessary details'
				await this.markFailed(resumeId, history.id, normalized, rawResponse, validationError)
				throw new Error(validationError)
			}

			// Step 5: Persist success
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
