import { ResumeJson } from '@/lib/types'

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

export interface ExtractionMetadata {
	inputType: 'TEXT' | 'IMAGES' | 'HYBRID'
	processingMethod: string
	confidence?: number
	additionalInfo?: Record<string, any>
}

export enum PDFContentType {
	TEXT_BASED = 'text-based',
	IMAGE_BASED = 'image-based',
	MIXED = 'mixed',
	SCANNED = 'scanned'
}

export interface PDFAnalysisResult {
	contentType: PDFContentType
	textContentRatio: number
	imageContentRatio: number
	pageCount: number
	hasText: boolean
	hasImages: boolean
	recommendedStrategy: string
}

/**
 * Base interface for all extraction strategies
 */
export interface ExtractionStrategy {
	/**
	 * The unique identifier for this strategy
	 */
	readonly strategyId: string

	/**
	 * Human-readable name for this strategy
	 */
	readonly displayName: string

	/**
	 * Check if this strategy can handle the given PDF content
	 */
	canHandle(analysisResult: PDFAnalysisResult): boolean

	/**
	 * Extract resume data from the PDF
	 */
	extract(params: ExtractResumeParams): Promise<ExtractionResult>

	/**
	 * Get additional metadata about the extraction process
	 */
	getMetadata(): ExtractionMetadata
}

/**
 * Interface for analyzing PDF content to determine the best extraction strategy
 */
export interface PDFAnalyzer {
	/**
	 * Analyze PDF content to determine its characteristics
	 */
	analyze(pdfArrayBuffer: ArrayBuffer): Promise<PDFAnalysisResult>
}

/**
 * Factory interface for creating extraction strategies
 */
export interface ExtractionStrategyFactory {
	/**
	 * Get the best strategy for the given PDF analysis result
	 */
	getStrategy(analysisResult: PDFAnalysisResult): ExtractionStrategy

	/**
	 * Get all available strategies
	 */
	getAllStrategies(): ExtractionStrategy[]

	/**
	 * Register a new strategy
	 */
	registerStrategy(strategy: ExtractionStrategy): void
}