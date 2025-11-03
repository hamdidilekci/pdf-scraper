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

export interface PDFAnalyzer {
	analyze(pdfArrayBuffer: ArrayBuffer): Promise<PDFAnalysisResult>
}
