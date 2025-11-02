import {
	ExtractResumeParams,
	ExtractionResult,
	SimplePDFAnalyzer,
	DefaultExtractionStrategyFactory,
	PDFAnalyzer,
	ExtractionStrategyFactory
} from './extraction'
import { logger } from '@/lib/logger'

/**
 * Main extraction service that orchestrates PDF analysis and extraction
 * Uses the strategy pattern to handle different types of PDFs
 */
export class ExtractionService {
	private pdfAnalyzer: PDFAnalyzer
	private strategyFactory: ExtractionStrategyFactory

	constructor(
		pdfAnalyzer?: PDFAnalyzer,
		strategyFactory?: ExtractionStrategyFactory
	) {
		this.pdfAnalyzer = pdfAnalyzer || new SimplePDFAnalyzer()
		this.strategyFactory = strategyFactory || new DefaultExtractionStrategyFactory()
	}

	/**
	 * Extract resume data from PDF using the most appropriate strategy
	 */
	async extractResume(params: ExtractResumeParams): Promise<ExtractionResult> {
		const { resumeId, pdfArrayBuffer, fileName, model } = params

		logger.info('Starting resume extraction', { resumeId, fileName, model })

		try {
			// Step 1: Analyze PDF to determine content type
			const analysisResult = await this.pdfAnalyzer.analyze(pdfArrayBuffer)

			logger.info('PDF analysis completed', {
				resumeId,
				contentType: analysisResult.contentType,
				textContentRatio: analysisResult.textContentRatio,
				imageContentRatio: analysisResult.imageContentRatio,
				recommendedStrategy: analysisResult.recommendedStrategy
			})

			// Step 2: Get appropriate extraction strategy
			const strategy = this.strategyFactory.getStrategy(analysisResult)

			logger.info('Selected extraction strategy', {
				resumeId,
				strategyId: strategy.strategyId,
				displayName: strategy.displayName
			})

			// Step 3: Execute extraction using selected strategy
			const result = await strategy.extract(params)

			logger.info('Resume extraction completed successfully', {
				resumeId,
				strategyId: strategy.strategyId,
				historyId: result.historyId
			})

			return result

		} catch (error) {
			logger.error('Resume extraction failed', error, { resumeId, fileName })
			throw error
		}
	}

	/**
	 * Get information about available extraction strategies
	 */
	getAvailableStrategies() {
		return this.strategyFactory.getAllStrategies().map(strategy => ({
			id: strategy.strategyId,
			displayName: strategy.displayName,
			metadata: strategy.getMetadata()
		}))
	}

	/**
	 * Analyze a PDF without extracting data
	 */
	async analyzePDF(pdfArrayBuffer: ArrayBuffer) {
		return this.pdfAnalyzer.analyze(pdfArrayBuffer)
	}
}
