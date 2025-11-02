import {
	ExtractionStrategy,
	ExtractionStrategyFactory,
	PDFAnalysisResult
} from './types'
import { TextExtractionStrategy } from './text-extraction.strategy'
import { ImageExtractionStrategy } from './image-extraction.strategy'
import { logger } from '@/lib/logger'

/**
 * Factory for creating and managing extraction strategies
 * Automatically selects the best strategy based on PDF analysis
 */
export class DefaultExtractionStrategyFactory implements ExtractionStrategyFactory {
	private strategies: Map<string, ExtractionStrategy> = new Map()

	constructor() {
		// Register built-in strategies
		this.registerStrategy(new TextExtractionStrategy())
		this.registerStrategy(new ImageExtractionStrategy())
	}

	/**
	 * Get the best strategy for the given PDF analysis result
	 */
	getStrategy(analysisResult: PDFAnalysisResult): ExtractionStrategy {
		// Try to find a strategy based on the recommended strategy from analysis
		const recommendedStrategy = this.strategies.get(analysisResult.recommendedStrategy)
		if (recommendedStrategy && recommendedStrategy.canHandle(analysisResult)) {
			logger.info('Using recommended strategy', {
				strategy: recommendedStrategy.strategyId,
				contentType: analysisResult.contentType
			})
			return recommendedStrategy
		}

		// Fallback: find first strategy that can handle the PDF
		for (const strategy of this.strategies.values()) {
			if (strategy.canHandle(analysisResult)) {
				logger.info('Using fallback strategy', {
					strategy: strategy.strategyId,
					contentType: analysisResult.contentType
				})
				return strategy
			}
		}

		// Ultimate fallback: use text extraction strategy
		const textStrategy = this.strategies.get('text-extraction')
		if (textStrategy) {
			logger.warn('Using text strategy as ultimate fallback', {
				contentType: analysisResult.contentType
			})
			return textStrategy
		}

		throw new Error('No suitable extraction strategy found')
	}

	/**
	 * Get all available strategies
	 */
	getAllStrategies(): ExtractionStrategy[] {
		return Array.from(this.strategies.values())
	}

	/**
	 * Register a new strategy
	 */
	registerStrategy(strategy: ExtractionStrategy): void {
		this.strategies.set(strategy.strategyId, strategy)
		logger.info('Registered extraction strategy', {
			strategyId: strategy.strategyId,
			displayName: strategy.displayName
		})
	}

	/**
	 * Get strategy by ID
	 */
	getStrategyById(strategyId: string): ExtractionStrategy | undefined {
		return this.strategies.get(strategyId)
	}

	/**
	 * List all strategy IDs
	 */
	getStrategyIds(): string[] {
		return Array.from(this.strategies.keys())
	}
}