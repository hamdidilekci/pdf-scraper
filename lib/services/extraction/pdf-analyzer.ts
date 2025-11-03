import { PDFAnalyzer, PDFAnalysisResult, PDFContentType } from './types'
import { logger } from '@/lib/logger'

export class SimplePDFAnalyzer implements PDFAnalyzer {
	async analyze(pdfArrayBuffer: ArrayBuffer): Promise<PDFAnalysisResult> {
		try {
			const buffer = new Uint8Array(pdfArrayBuffer)
			const pdfString = new TextDecoder('latin1').decode(buffer.slice(0, 10000))

			const hasTextObjects = pdfString.includes('/Type /Font') || pdfString.includes('BT ') || pdfString.includes('Tj ') || pdfString.includes('TJ ')

			const hasImageObjects =
				pdfString.includes('/Type /XObject') ||
				pdfString.includes('/Subtype /Image') ||
				pdfString.includes('DCTDecode') ||
				pdfString.includes('FlateDecode')

			const textIndicators = (pdfString.match(/BT |Tj |TJ |\/Font/g) || []).length
			const imageIndicators = (pdfString.match(/\/XObject|\/Image|DCTDecode/g) || []).length

			const textScore = textIndicators + (hasTextObjects ? 5 : 0)
			const imageScore = imageIndicators + (hasImageObjects ? 5 : 0)

			let contentType: PDFContentType
			let recommendedStrategy = 'text-extraction'

			if (textScore === 0 && imageScore === 0) {
				contentType = PDFContentType.TEXT_BASED
			} else if (!hasTextObjects && hasImageObjects) {
				contentType = PDFContentType.SCANNED
				recommendedStrategy = 'image-extraction'
			} else if (!hasImageObjects && hasTextObjects) {
				contentType = PDFContentType.TEXT_BASED
			} else if (textScore >= imageScore * 1.3) {
				contentType = PDFContentType.TEXT_BASED
			} else if (imageScore >= textScore * 1.3) {
				contentType = imageIndicators > textIndicators ? PDFContentType.IMAGE_BASED : PDFContentType.SCANNED
				recommendedStrategy = 'image-extraction'
			} else {
				contentType = PDFContentType.MIXED
				recommendedStrategy = imageScore > textScore ? 'image-extraction' : 'text-extraction'
			}

			const totalIndicators = textIndicators + imageIndicators
			const textContentRatio = totalIndicators > 0 ? textIndicators / totalIndicators : hasTextObjects ? 1 : 0
			const imageContentRatio = totalIndicators > 0 ? imageIndicators / totalIndicators : hasImageObjects ? 1 : 0

			const pageCount = Math.max(1, (pdfString.match(/\/Type \/Page[^s]/g) || []).length)

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
				textIndicators,
				imageIndicators,
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
