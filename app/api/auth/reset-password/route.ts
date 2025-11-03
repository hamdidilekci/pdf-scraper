import { z } from 'zod'
import bcrypt from 'bcrypt'
import prisma from '@/lib/prisma'
import { badRequest, serverError, notFound } from '@/lib/api-errors'
import { success } from '@/lib/api-response'
import { OTPService } from '@/lib/services/otp.service'
import { logger } from '@/lib/logger'

const schema = z.object({
	email: z.string().email(),
	otp: z.string().min(1),
	password: z.string().min(8, 'Password must be at least 8 characters long')
})

export async function POST(request: Request) {
	try {
		const json = await request.json()
		const parsed = schema.safeParse(json)

		if (!parsed.success) {
			const errorMessage = parsed.error.errors
				.map((err) => {
					if (err.path.includes('email')) return 'Please enter a valid email address'
					if (err.path.includes('password')) return 'Password must be at least 8 characters long'
					return err.message
				})
				.join('. ')
			throw badRequest(errorMessage)
		}

		const { email, otp, password } = parsed.data
		const normalizedEmail = email.toLowerCase().trim()

		// Verify OTP was validated
		const otpService = new OTPService()
		const isVerified = await otpService.isOTPVerified(normalizedEmail)

		if (!isVerified) {
			// Also check if OTP is valid now (in case they're doing it in one go)
			const isValid = await otpService.validatePasswordResetOTP(normalizedEmail, otp)
			if (!isValid) {
				throw badRequest('Invalid or expired verification code. Please request a new one.')
			}
		}

		// Find user
		const user = await prisma.user.findUnique({
			where: { email: normalizedEmail }
		})

		if (!user) {
			logger.warn('Reset password attempted for non-existent user', { email: normalizedEmail })
			// Return generic error to prevent email enumeration
			throw badRequest('Invalid or expired verification code. Please request a new one.')
		}

		// Hash new password
		const hashedPassword = await bcrypt.hash(password, 10)

		// Update password
		await prisma.user.update({
			where: { id: user.id },
			data: { hashedPassword }
		})

		// Delete OTP record
		await otpService.deletePasswordResetOTP(normalizedEmail)

		// Optional: Invalidate all sessions
		await prisma.session.deleteMany({
			where: { userId: user.id }
		})

		logger.info('Password reset successful', { email: normalizedEmail })

		return success({ message: 'Your password has been reset successfully.' })
	} catch (error) {
		logger.error('Reset password error', error, { endpoint: '/api/auth/reset-password' })
		throw serverError('We could not reset your password. Please try again.')
	}
}
