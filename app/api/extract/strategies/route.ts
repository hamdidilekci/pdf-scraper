import { success } from '@/lib/api-response'
import { ExtractionService } from '@/lib/services/extraction.service'

export const runtime = 'nodejs'

/**
 * GET /api/extract/strategies
 * Returns information about available extraction strategies
 */
export async function GET() {
	const extractionService = new ExtractionService()
	const strategies = extractionService.getAvailableStrategies()

	return success({
		strategies,
		totalCount: strategies.length,
		description: 'Available PDF extraction strategies'
	})
}