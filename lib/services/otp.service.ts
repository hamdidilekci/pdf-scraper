import bcrypt from 'bcrypt'
import prisma from '@/lib/prisma'
import { EmailService } from './email.service'
import { logger } from '@/lib/logger'
import { OTP } from '@/lib/constants'

export class OTPService {
	private emailService: EmailService

	constructor() {
		this.emailService = new EmailService()
	}

	generateOTP(): string {
		const crypto = require('crypto')
		let otp = ''
		for (let i = 0; i < OTP.LENGTH; i++) {
			// Use cryptographically secure random
			const randomValue = crypto.randomInt(0, 10)
			otp += OTP.DIGITS[randomValue]
		}
		return otp
	}

	async hashOTP(otp: string): Promise<string> {
		return bcrypt.hash(otp, 10)
	}

	async verifyOTP(plainOTP: string, hashedOTP: string): Promise<boolean> {
		return bcrypt.compare(plainOTP, hashedOTP)
	}

	async createPasswordResetOTP(email: string): Promise<void> {
		const normalizedEmail = email.toLowerCase().trim()

		// Check rate limiting
		await this.checkRateLimit(normalizedEmail)

		// Check if user exists
		const user = await prisma.user.findUnique({
			where: { email: normalizedEmail }
		})

		// Don't reveal if email exists for security
		if (!user) {
			// Simulate delay to prevent timing attacks
			await new Promise((resolve) => setTimeout(resolve, 500))
			logger.warn('Password reset requested for non-existent email', { email: normalizedEmail })
			return
		}

		// Generate and hash OTP
		const otp = this.generateOTP()
		const hashedOTP = await this.hashOTP(otp)
		const expiresAt = new Date(Date.now() + OTP.EXPIRY_MINUTES * 60 * 1000)

		// Invalidate any existing OTPs for this email
		await prisma.passwordResetOTP.deleteMany({
			where: { email: normalizedEmail }
		})

		// Create new OTP record
		await prisma.passwordResetOTP.create({
			data: {
				email: normalizedEmail,
				otp: hashedOTP,
				expiresAt,
				attempts: 0,
				verified: false
			}
		})

		// Send email
		await this.emailService.sendPasswordResetOTP(normalizedEmail, otp)

		logger.info('Password reset OTP created', { email: normalizedEmail })
	}

	async validatePasswordResetOTP(email: string, otp: string): Promise<boolean> {
		const normalizedEmail = email.toLowerCase().trim()

		const otpRecord = await prisma.passwordResetOTP.findFirst({
			where: {
				email: normalizedEmail,
				expiresAt: { gt: new Date() }
			},
			orderBy: { createdAt: 'desc' }
		})

		if (!otpRecord) {
			logger.warn('OTP not found or expired', { email: normalizedEmail })
			return false
		}

		// Check attempts
		if (otpRecord.attempts >= OTP.MAX_ATTEMPTS) {
			logger.warn('OTP max attempts exceeded', { email: normalizedEmail, attempts: otpRecord.attempts })
			return false
		}

		// Verify OTP
		const isValid = await this.verifyOTP(otp, otpRecord.otp)

		if (!isValid) {
			// Increment attempts
			await prisma.passwordResetOTP.update({
				where: { id: otpRecord.id },
				data: { attempts: { increment: 1 } }
			})
			logger.warn('Invalid OTP attempted', { email: normalizedEmail, attempts: otpRecord.attempts + 1 })
			return false
		}

		// Mark as verified
		await prisma.passwordResetOTP.update({
			where: { id: otpRecord.id },
			data: { verified: true }
		})

		logger.info('OTP verified successfully', { email: normalizedEmail })
		return true
	}

	async isOTPVerified(email: string): Promise<boolean> {
		const normalizedEmail = email.toLowerCase().trim()

		const otpRecord = await prisma.passwordResetOTP.findFirst({
			where: {
				email: normalizedEmail,
				verified: true,
				expiresAt: { gt: new Date() }
			},
			orderBy: { createdAt: 'desc' }
		})

		return !!otpRecord
	}

	private async checkRateLimit(email: string): Promise<void> {
		const oneHourAgo = new Date(Date.now() - OTP.RATE_LIMIT_WINDOW_MS)

		const recentRequests = await prisma.passwordResetOTP.count({
			where: {
				email,
				createdAt: { gte: oneHourAgo }
			}
		})

		if (recentRequests >= OTP.MAX_REQUESTS_PER_HOUR) {
			logger.warn('Rate limit exceeded for password reset', { email, requests: recentRequests })
			throw new Error(`Too many password reset requests. Please try again in ${OTP.EXPIRY_MINUTES} minutes.`)
		}
	}

	async cleanupExpiredOTPs(): Promise<void> {
		const deleted = await prisma.passwordResetOTP.deleteMany({
			where: {
				expiresAt: { lt: new Date() }
			}
		})

		if (deleted.count > 0) {
			logger.info('Cleaned up expired OTPs', { count: deleted.count })
		}
	}

	async deletePasswordResetOTP(email: string): Promise<void> {
		await prisma.passwordResetOTP.deleteMany({
			where: { email: email.toLowerCase().trim() }
		})
	}
}
