import { getOpenAI } from '@/lib/openai'
import { config } from '@/lib/config'
import { OPENAI_FILES_URL, OPENAI_RESPONSES_URL, OPENAI_FILE_PURPOSE, DEFAULT_FILE_NAME } from '@/lib/constants'
import { logger } from '@/lib/logger'

export interface UploadFileResult {
	fileId: string
	originalResponse: any
}

export interface ResponsesAPIParams {
	fileId: string
	model: string
	prompt: string
	temperature?: number
}

export interface ResponsesAPIResult {
	rawResponse: any
	outputText: string
}

export interface ProcessDocumentParams {
	arrayBuffer: ArrayBuffer
	fileName?: string
	prompt: string
	model: string
	temperature?: number
}

export interface ProcessDocumentResult {
	fileId: string
	extractedText: string
	rawResponse: any
}

/**
 * OpenAI AI Provider - Handles all OpenAI-specific operations
 * This service can be used by different extraction strategies
 */
export class OpenAIService {
	private openai = getOpenAI()
	private apiKey = config.openai.apiKey

	/**
	 * High-level method to process a document end-to-end
	 */
	async processDocument(params: ProcessDocumentParams): Promise<ProcessDocumentResult> {
		const { arrayBuffer, fileName, prompt, model, temperature = 0 } = params

		// Upload file
		const uploadResult = await this.uploadFile(arrayBuffer, fileName)

		try {
			// Process with AI
			const responseResult = await this.callResponsesAPI({
				fileId: uploadResult.fileId,
				model,
				prompt,
				temperature
			})

			return {
				fileId: uploadResult.fileId,
				extractedText: responseResult.outputText,
				rawResponse: responseResult.rawResponse
			}
		} finally {
			// Clean up file
			await this.deleteFile(uploadResult.fileId)
		}
	}

	/**
	 * Upload a file to OpenAI Files API
	 */
	async uploadFile(arrayBuffer: ArrayBuffer, fileName?: string): Promise<UploadFileResult> {
		const filesForm = new FormData()
		const safeFileName = fileName || DEFAULT_FILE_NAME

		filesForm.append('purpose', OPENAI_FILE_PURPOSE)
		filesForm.append('file', new Blob([arrayBuffer], { type: 'application/pdf' }), safeFileName)

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

		let parsed: any
		try {
			parsed = JSON.parse(raw)
		} catch {
			logger.error('Failed to parse OpenAI Files API response', undefined, { raw: raw.slice(0, 200) })
			throw new Error('Failed to parse OpenAI Files API response')
		}

		const fileId = parsed?.id
		if (!fileId) {
			logger.error('Failed to obtain file ID from OpenAI', undefined, { raw: raw.slice(0, 200) })
			throw new Error('Unable to prepare your resume for processing. Please try again')
		}

		return {
			fileId,
			originalResponse: parsed
		}
	}

	/**
	 * Call OpenAI Responses API with file and prompt
	 */
	async callResponsesAPI(params: ResponsesAPIParams): Promise<ResponsesAPIResult> {
		const { fileId, model, prompt, temperature = 0 } = params

		const requestBody = {
			model,
			temperature,
			text: { format: { type: 'json_object' } },
			input: [
				{
					role: 'user',
					content: [
						{ type: 'input_text', text: prompt },
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
			body: JSON.stringify(requestBody)
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

		// Extract output text using heuristics
		const outputText = this.extractOutputText(parsed)

		return {
			rawResponse: parsed,
			outputText
		}
	}

	/**
	 * Parse JSON from AI response with retry logic
	 */
	async parseJsonWithRetry(
		fileId: string,
		model: string,
		originalResponse: any,
		basePrompt: string
	): Promise<any> {
		// First, try to extract JSON from original response
		const outputText = this.extractOutputText(originalResponse)

		try {
			return JSON.parse(outputText)
		} catch {
			// Retry with enhanced prompt for better JSON formatting
			logger.warn('Initial JSON parse failed, retrying with enhanced prompt', {
				outputText: outputText.slice(0, 200)
			})

			const enhancedPrompt = `${basePrompt}\n\nIMPORTANT: Return ONLY a valid JSON object without any markdown formatting or code blocks. If the previous output was invalid, strictly follow the schema now.`

			const retryResult = await this.callResponsesAPI({
				fileId,
				model,
				prompt: enhancedPrompt,
				temperature: 0
			})

			const retryText = this.extractOutputText(retryResult.rawResponse)

			try {
				return JSON.parse(retryText)
			} catch {
				logger.error('Retry JSON parse also failed', undefined, {
					retryText: retryText.slice(0, 200)
				})
				throw new Error('Unable to parse AI response as valid JSON')
			}
		}
	}

	/**
	 * Extract output text from various OpenAI response formats
	 */
	private extractOutputText(response: any): string {
		if (response?.output_text) {
			return response.output_text
		}

		if (Array.isArray(response?.output)) {
			const firstText = response.output.find((p: any) => p?.content?.[0]?.type === 'output_text')
			const text = firstText?.content?.[0]?.text
			if (text) return text
		}

		if (response?.choices?.[0]?.message?.content) {
			return response.choices[0].message.content
		}

		return ''
	}

	/**
	 * Delete a file from OpenAI
	 */
	async deleteFile(fileId: string): Promise<void> {
		try {
			await this.openai.files.delete(fileId)
			logger.info('File deleted from OpenAI', { fileId })
		} catch (error) {
			logger.warn('Failed to delete file from OpenAI', { fileId })
			// Don't throw - file cleanup is not critical
		}
	}
}