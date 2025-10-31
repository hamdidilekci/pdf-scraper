// API Endpoints
export const OPENAI_API_BASE = 'https://api.openai.com/v1'
export const OPENAI_FILES_URL = `${OPENAI_API_BASE}/files`
export const OPENAI_RESPONSES_URL = `${OPENAI_API_BASE}/responses`

// Default Model
export const DEFAULT_OPENAI_MODEL = 'gpt-4.1'

// File Configuration
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
export const MAX_FILE_SIZE_MB = 10
export const SUPPORTED_FILE_TYPES = ['application/pdf'] as const
export const DEFAULT_FILE_NAME = 'document.pdf'

// Supabase Storage
export const DEFAULT_STORAGE_BUCKET = 'pdfs'
export const SIGNED_URL_EXPIRY_SECONDS = 3600 // 1 hour

// HTTP Status Codes
export const HTTP_STATUS = {
	OK: 200,
	CREATED: 201,
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	NOT_FOUND: 404,
	CONFLICT: 409,
	UNPROCESSABLE_ENTITY: 422,
	INTERNAL_SERVER_ERROR: 500,
	BAD_GATEWAY: 502,
	SERVICE_UNAVAILABLE: 503
} as const

// Error Messages
export const ERROR_MESSAGES = {
	UNAUTHORIZED: 'Unauthorized',
	NOT_FOUND: 'Not found',
	BAD_REQUEST: 'Bad request',
	SERVER_ERROR: 'Internal server error',
	VALIDATION_FAILED: 'Validation failed',
	FILE_TOO_LARGE: `File exceeds ${MAX_FILE_SIZE_MB}MB limit`,
	UNSUPPORTED_FILE_TYPE: 'Only PDF files are supported',
	OPENAI_ERROR: 'OpenAI API error',
	STORAGE_ERROR: 'Storage operation failed',
	INVALID_JSON: 'Invalid JSON response',
	SCHEMA_VALIDATION_FAILED: 'Schema validation failed',
	MISSING_ENV_VAR: 'Required environment variable is missing'
} as const

// Pagination
export const DEFAULT_PAGE_LIMIT = 20
export const MAX_PAGE_LIMIT = 100

// OpenAI Files API Purpose
export const OPENAI_FILE_PURPOSE = 'user_data' as const
