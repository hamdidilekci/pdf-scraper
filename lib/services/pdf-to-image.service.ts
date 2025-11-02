import { logger } from '@/lib/logger'
import { MAX_PDF_PAGES } from '@/lib/constants'

export interface PdfImageResult {
	pageNumber: number
	buffer: Buffer
}

export class PdfToImageService {
	/**
	 * Converts PDF pages to PNG images
	 * @param pdfArrayBuffer - The PDF file as ArrayBuffer
	 * @returns Array of image buffers with page numbers
	 */
	async convertToImages(pdfArrayBuffer: ArrayBuffer): Promise<PdfImageResult[]> {
		try {
			// Convert ArrayBuffer to Buffer for pdf-to-img
			const pdfBuffer = Buffer.from(pdfArrayBuffer)

			// Dynamically import pdf-to-img to avoid bundler issues with native dependencies
			const { pdf } = await import('pdf-to-img')

			// Convert PDF to images using pdf-to-img
			// pdf() returns an async iterable of image buffers
			const document = await pdf(pdfBuffer, {
				scale: 2
			})

			const results: PdfImageResult[] = []
			let pageNumber = 1

			// Iterate through pages
			for await (const image of document) {
				// pdf-to-img returns Buffer objects directly
				results.push({
					pageNumber,
					buffer: image
				})

				pageNumber++

				// Limit pages to MAX_PDF_PAGES
				if (results.length >= MAX_PDF_PAGES) {
					break
				}
			}

			logger.info('PDF converted to images', {
				totalPages: results.length
			})

			if (results.length === 0) {
				throw new Error('No pages found in PDF')
			}

			return results
		} catch (error) {
			logger.error('Failed to convert PDF to images', error)
			throw new Error('Failed to convert PDF pages to images. Please ensure the PDF is valid and try again.')
		}
	}
}
