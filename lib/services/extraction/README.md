# PDF Extraction System

A modular, extensible PDF extraction system that automatically selects the best strategy for processing different types of PDF documents.

## Architecture Overview

The system follows the **Strategy Pattern** to handle different types of PDF documents:

```
ExtractionService (Orchestrator)
├── PDFAnalyzer (Analyzes PDF content)
├── ExtractionStrategyFactory (Selects appropriate strategy)
└── ExtractionStrategy implementations
    ├── TextExtractionStrategy (for text-based PDFs)
    ├── ImageExtractionStrategy (for scanned/image PDFs)
    └── [Future strategies...]
```

## Key Components

### 1. PDF Analysis
- **`SimplePDFAnalyzer`**: Analyzes PDF structure to determine content type
- Detects text content, images, and recommends extraction strategy
- Returns `PDFAnalysisResult` with content ratios and recommendations

### 2. Extraction Strategies
- **`TextExtractionStrategy`**: Handles text-based PDFs using OpenAI's file API
- **`ImageExtractionStrategy`**: Placeholder for OCR-based extraction (future)
- Each strategy implements the `ExtractionStrategy` interface

### 3. Strategy Factory
- **`DefaultExtractionStrategyFactory`**: Selects the best strategy based on PDF analysis
- Automatically registers available strategies
- Supports adding new strategies at runtime

### 4. AI Provider
- **`OpenAIService`**: Reusable AI provider for different extraction strategies
- Handles file uploads, API calls, and response parsing
- Includes retry logic for better reliability

## Usage

### Basic Extraction
```typescript
import { ExtractionService } from '@/lib/services/extraction.service'

const extractionService = new ExtractionService()
const result = await extractionService.extractResume({
  resumeId: 'resume-123',
  pdfArrayBuffer: pdfData,
  fileName: 'resume.pdf',
  model: 'gpt-4'
})
```

### PDF Analysis Only
```typescript
const analysisResult = await extractionService.analyzePDF(pdfArrayBuffer)
console.log('Content type:', analysisResult.contentType)
console.log('Recommended strategy:', analysisResult.recommendedStrategy)
```

### Custom Strategy Factory
```typescript
import {
  ExtractionService,
  DefaultExtractionStrategyFactory,
  CustomExtractionStrategy
} from '@/lib/services/extraction'

const factory = new DefaultExtractionStrategyFactory()
factory.registerStrategy(new CustomExtractionStrategy())

const extractionService = new ExtractionService(undefined, factory)
```

## API Endpoints

### Extract Resume Data
```
POST /api/extract/responses
Body: { storagePath: "path/to/pdf" }
```

### Analyze PDF
```
POST /api/extract/analyze
Body: { storagePath: "path/to/pdf" }
Response: { analysis, availableStrategies, recommendation }
```

### Get Available Strategies
```
GET /api/extract/strategies
Response: { strategies: [...], totalCount: 2 }
```

## Extending the System

### Adding a New Extraction Strategy

1. **Create the strategy class:**
```typescript
import { ExtractionStrategy, ExtractResumeParams, ExtractionResult } from './types'

export class CustomExtractionStrategy implements ExtractionStrategy {
  readonly strategyId = 'custom-extraction'
  readonly displayName = 'Custom PDF Extraction'

  canHandle(analysisResult: PDFAnalysisResult): boolean {
    // Define when this strategy should be used
    return analysisResult.contentType === PDFContentType.CUSTOM
  }

  async extract(params: ExtractResumeParams): Promise<ExtractionResult> {
    // Implement extraction logic
  }

  getMetadata(): ExtractionMetadata {
    return {
      inputType: 'TEXT',
      processingMethod: 'custom-method',
      confidence: 0.85
    }
  }
}
```

2. **Register the strategy:**
```typescript
const factory = new DefaultExtractionStrategyFactory()
factory.registerStrategy(new CustomExtractionStrategy())
```

### Adding a Custom PDF Analyzer
```typescript
import { PDFAnalyzer, PDFAnalysisResult } from './types'

export class AdvancedPDFAnalyzer implements PDFAnalyzer {
  async analyze(pdfArrayBuffer: ArrayBuffer): Promise<PDFAnalysisResult> {
    // Use advanced PDF parsing libraries
    // Return detailed analysis results
  }
}

const extractionService = new ExtractionService(new AdvancedPDFAnalyzer())
```

## Future Enhancements

### Image-based Extraction
The `ImageExtractionStrategy` is currently a placeholder. Future implementation could include:

1. **OCR Integration**:
   - Tesseract.js for client-side OCR
   - Google Vision API for cloud OCR
   - AWS Textract for document analysis

2. **PDF to Image Conversion**:
   - pdf2pic for converting PDF pages to images
   - Canvas API for image manipulation

3. **AI Vision**:
   - OpenAI Vision API for understanding document layout
   - Custom computer vision models

### Example Implementation Outline:
```typescript
export class ImageExtractionStrategy implements ExtractionStrategy {
  async extract(params: ExtractResumeParams): Promise<ExtractionResult> {
    // 1. Convert PDF to images
    const images = await this.pdfToImages(params.pdfArrayBuffer)

    // 2. Run OCR on images
    const text = await this.runOCR(images)

    // 3. Use AI to structure the text
    const structuredData = await this.aiService.structureText(text, prompt)

    // 4. Validate and return
    return this.validateAndSave(structuredData, params.resumeId)
  }
}
```

## Benefits of This Architecture

1. **Modularity**: Each extraction method is isolated and testable
2. **Extensibility**: Easy to add new strategies for different PDF types
3. **Maintainability**: Clear separation of concerns
4. **Flexibility**: Can mix and match analyzers and strategies
5. **Future-proof**: Ready for new AI models and extraction techniques

## Configuration

The system uses existing configuration from:
- `@/lib/config` for API keys and settings
- `@/lib/constants` for API endpoints and defaults
- Environment variables for sensitive data

No additional configuration is required for the new modular structure.