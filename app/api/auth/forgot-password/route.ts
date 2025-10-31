import { z } from 'zod'
import { badRequest, serverError } from '@/lib/api-errors'
import { success } from '@/lib/api-response'
import { OTPService } from '@/lib/services/otp.service'
import { logger } from '@/lib/logger'

const schema = z.object({
	email: z.string().email()
})

export async function POST(request: Request) {
	let email: string | undefined
	try {
		const json = await request.json()
		const parsed = schema.safeParse(json)

		if (!parsed.success) {
			return badRequest('Please enter a valid email address')
		}

		email = parsed.data.email
		const emailService = new OTPService()

		// Create OTP and send email
		// Don't reveal if email exists for security
		await emailService.createPasswordResetOTP(email)

		// Cleanup expired OTPs periodically
		await emailService.cleanupExpiredOTPs()

		// Always return success to prevent email enumeration
		return success({ message: 'If an account exists with this email, you will receive a password reset code.' })
	} catch (error) {
		if (error instanceof Error && error.message.includes('Too many')) {
			logger.warn('Rate limit exceeded', { error: error.message, email })
			return badRequest(error.message)
		}

		if (error instanceof Error && error.message.includes('Email service is not configured')) {
			logger.error('Email service configuration error', error, { endpoint: '/api/auth/forgot-password', email })
			return serverError('Email service is not configured. Please contact support.')
		}

		logger.error('Forgot password error', error, { endpoint: '/api/auth/forgot-password', email })
		return serverError('We could not process your request. Please try again later.')
	}
}
