import { NextResponse } from 'next/server'
import { HTTP_STATUS, ERROR_MESSAGES } from './constants'

export interface ApiError {
	message: string
	code?: string
	details?: any
}

export function createErrorResponse(message: string, status: number = HTTP_STATUS.INTERNAL_SERVER_ERROR, code?: string, details?: any): NextResponse {
	return NextResponse.json(
		{
			success: false,
			error: {
				message,
				code,
				details
			}
		},
		{ status }
	)
}

export function unauthorized(message: string = ERROR_MESSAGES.UNAUTHORIZED): NextResponse {
	return createErrorResponse(message, HTTP_STATUS.UNAUTHORIZED, 'UNAUTHORIZED')
}

export function notFound(message: string = ERROR_MESSAGES.NOT_FOUND): NextResponse {
	return createErrorResponse(message, HTTP_STATUS.NOT_FOUND, 'NOT_FOUND')
}

export function badRequest(message: string = ERROR_MESSAGES.BAD_REQUEST, details?: any): NextResponse {
	return createErrorResponse(message, HTTP_STATUS.BAD_REQUEST, 'BAD_REQUEST', details)
}

export function serverError(message: string = ERROR_MESSAGES.SERVER_ERROR, details?: any): NextResponse {
	return createErrorResponse(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'SERVER_ERROR', details)
}

export function validationError(message: string = ERROR_MESSAGES.VALIDATION_FAILED, details?: any): NextResponse {
	return createErrorResponse(message, HTTP_STATUS.UNPROCESSABLE_ENTITY, 'VALIDATION_ERROR', details)
}

export function conflict(message: string, details?: any): NextResponse {
	return createErrorResponse(message, HTTP_STATUS.CONFLICT, 'CONFLICT', details)
}
