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
	UNAUTHORIZED: 'Please sign in to continue',
	NOT_FOUND: 'The requested resource could not be found',
	BAD_REQUEST: 'Invalid request. Please check your input and try again',
	SERVER_ERROR: 'Something went wrong on our end. Please try again later',
	VALIDATION_FAILED: 'The information you provided is invalid. Please check and try again',
	FILE_TOO_LARGE: `File size must be less than ${MAX_FILE_SIZE_MB}MB. Please choose a smaller file`,
	UNSUPPORTED_FILE_TYPE: 'Only PDF files are supported. Please select a PDF file',
	OPENAI_ERROR: 'We encountered an issue processing your resume. Please try again',
	STORAGE_ERROR: 'Unable to save your file. Please try again',
	INVALID_JSON: 'We received an unexpected response. Please try again',
	SCHEMA_VALIDATION_FAILED: 'We could not extract all required information from your resume. Please try again with a clearer document',
	MISSING_ENV_VAR: 'Required environment variable is missing'
} as const

// Pagination
export const DEFAULT_PAGE_LIMIT = 20
export const MAX_PAGE_LIMIT = 100

// OpenAI Files API Purpose
export const OPENAI_FILE_PURPOSE = 'user_data' as const

// OTP Configuration
export const OTP = {
	LENGTH: 6,
	EXPIRY_MINUTES: 10,
	MAX_ATTEMPTS: 5,
	MAX_REQUESTS_PER_HOUR: 3,
	RATE_LIMIT_WINDOW_MS: 60 * 60 * 1000, // 1 hour
	DIGITS: '0123456789'
} as const satisfies {
	LENGTH: number
	EXPIRY_MINUTES: number
	MAX_ATTEMPTS: number
	MAX_REQUESTS_PER_HOUR: number
	RATE_LIMIT_WINDOW_MS: number
	DIGITS: string
}

// Credit System Configuration
export const CREDITS_PER_RESUME = 100

export const PLAN_TYPES = {
	BASIC: 'BASIC',
	PRO: 'PRO'
} as const

export const PLAN_CREDITS = {
	BASIC: 10000,
	PRO: 20000
} as const

export type PlanType = 'BASIC' | 'PRO' | null