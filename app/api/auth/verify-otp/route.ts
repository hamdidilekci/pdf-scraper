import { z } from 'zod'
import { badRequest, serverError } from '@/lib/api-errors'
import { success } from '@/lib/api-response'
import { OTPService } from '@/lib/services/otp.service'
import { logger } from '@/lib/logger'
import { OTP } from '@/lib/constants'

const schema = z.object({
	email: z.string().email(),
	otp: z.string().length(OTP.LENGTH, `Verification code must be ${OTP.LENGTH} digits`)
})

export async function POST(request: Request) {
	try {
		const json = await request.json()
		const parsed = schema.safeParse(json)

		if (!parsed.success) {
			const errorMessage = parsed.error.errors[0]?.message || 'Invalid input'
			return badRequest(errorMessage)
		}

		const otpService = new OTPService()
		const isValid = await otpService.validatePasswordResetOTP(parsed.data.email, parsed.data.otp)

		if (!isValid) {
			return badRequest('Invalid or expired verification code. Please request a new one.')
		}

		return success({ verified: true })
	} catch (error) {
		logger.error('Verify OTP error', error, { endpoint: '/api/auth/verify-otp' })
		return serverError('We could not verify your code. Please try again.')
	}
}
