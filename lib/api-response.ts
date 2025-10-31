import { NextResponse } from 'next/server'
import { HTTP_STATUS } from './constants'

export interface ApiSuccessResponse<T = any> {
	success: true
	data: T
}

export interface ApiErrorResponse {
	success: false
	error: {
		message: string
		code?: string
		details?: any
	}
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse

export function success<T>(data: T, status: number = HTTP_STATUS.OK): NextResponse<ApiSuccessResponse<T>> {
	return NextResponse.json(
		{
			success: true as const,
			data
		},
		{ status }
	)
}

export function created<T>(data: T): NextResponse<ApiSuccessResponse<T>> {
	return success(data, HTTP_STATUS.CREATED)
}
