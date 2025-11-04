import { PDFAnalyzer, PDFAnalysisResult, PDFContentType } from './types'
import { logger } from '@/lib/logger'

export class SimplePDFAnalyzer implements PDFAnalyzer {
	async analyze(pdfArrayBuffer: ArrayBuffer): Promise<PDFAnalysisResult> {
		try {
			const buffer = new Uint8Array(pdfArrayBuffer)

			const sliceSize = Math.min(buffer.length, 200000)
			const pdfString = new TextDecoder('latin1').decode(buffer.slice(0, sliceSize))
			const pageMatches = pdfString.match(/\/Type\s*\/Page\b/g) || []
			const pageCount = Math.max(1, pageMatches.length)

			const hasTextObjects = pdfString.includes('/Type /Font') || pdfString.includes('BT ') || pdfString.includes('Tj ') || pdfString.includes('TJ ')

			const hasImageObjects = pdfString.includes('/Subtype /Image') || pdfString.includes('/XObject') || pdfString.includes('DCTDecode')

			const textIndicators = (pdfString.match(/BT |Tj |TJ |\/Font/g) || []).length
			const imageIndicators = (pdfString.match(/\/Image|DCTDecode/g) || []).length

			const textScore = textIndicators * 2 + (hasTextObjects ? 10 : 0)
			const imageScore = imageIndicators + (hasImageObjects ? 3 : 0)

			// Heuristic thresholds
			let contentType: PDFContentType
			let recommendedStrategy = 'text-extraction'

			if (textScore > 5 && imageScore < 5) {
				contentType = PDFContentType.TEXT_BASED
			} else if (textScore === 0 && imageScore > 0) {
				contentType = PDFContentType.SCANNED
				recommendedStrategy = 'image-extraction'
			} else if (textScore > imageScore * 1.5) {
				contentType = PDFContentType.TEXT_BASED
			} else if (imageScore > textScore * 2) {
				contentType = PDFContentType.IMAGE_BASED
				recommendedStrategy = 'image-extraction'
			} else {
				contentType = PDFContentType.MIXED
				recommendedStrategy = 'text-extraction'
			}

			const totalIndicators = textIndicators + imageIndicators
			const textContentRatio = totalIndicators > 0 ? textIndicators / totalIndicators : hasTextObjects ? 1 : 0
			const imageContentRatio = totalIndicators > 0 ? imageIndicators / totalIndicators : hasImageObjects ? 1 : 0

			const result: PDFAnalysisResult = {
				contentType,
				textContentRatio,
				imageContentRatio,
				pageCount,
				hasText: hasTextObjects,
				hasImages: hasImageObjects,
				recommendedStrategy
			}

			logger.info('PDF analysis completed', {
				contentType,
				textContentRatio,
				textIndicators,
				imageContentRatio,
				imageIndicators,
				pageCount,
				textScore,
				imageScore,
				recommendedStrategy
			})

			return result
		} catch (error) {
			logger.warn('PDF analysis failed, using fallback', { error })

			return {
				contentType: PDFContentType.TEXT_BASED,
				textContentRatio: 0.9,
				imageContentRatio: 0.1,
				pageCount: 1,
				hasText: true,
				hasImages: false,
				recommendedStrategy: 'text-extraction'
			}
		}
	}
}
