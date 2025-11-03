import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

interface RateLimitConfig {
	maxAttempts: number
	windowMs: number
	blockDurationMs: number
}

const DEFAULT_CONFIG: RateLimitConfig = {
	maxAttempts: 5, // Max failed login attempts
	windowMs: 15 * 60 * 1000, // 15 minutes window
	blockDurationMs: 30 * 60 * 1000 // Block for 30 minutes
}

export class RateLimitService {
	private config: RateLimitConfig

	constructor(config?: Partial<RateLimitConfig>) {
		this.config = { ...DEFAULT_CONFIG, ...config }
	}

	/**
	 * Check if an identifier (email/IP) is currently blocked
	 */
	async isBlocked(identifier: string, type: 'login' = 'login'): Promise<boolean> {
		const key = `${type}:${identifier.toLowerCase()}`
		const now = new Date()

		// Find recent failed attempts
		const recentAttempts = await prisma.rateLimitAttempt.findMany({
			where: {
				key,
				createdAt: {
					gte: new Date(now.getTime() - this.config.windowMs)
				}
			},
			orderBy: { createdAt: 'desc' }
		})

		if (recentAttempts.length === 0) {
			return false
		}

		// Check if blocked
		const blockedAttempt = recentAttempts.find((attempt) => attempt.blocked && new Date(attempt.blockedUntil!) > now)

		if (blockedAttempt) {
			logger.warn('Rate limit blocked attempt', {
				identifier,
				type,
				blockedUntil: blockedAttempt.blockedUntil
			})
			return true
		}

		// Count failed attempts in window
		const failedCount = recentAttempts.filter((a) => !a.success).length

		if (failedCount >= this.config.maxAttempts) {
			// Block the identifier
			const blockedUntil = new Date(now.getTime() + this.config.blockDurationMs)

			await prisma.rateLimitAttempt.create({
				data: {
					key,
					success: false,
					blocked: true,
					blockedUntil,
					metadata: { reason: 'max_attempts_exceeded', failedCount }
				}
			})

			logger.warn('Rate limit triggered - blocking identifier', {
				identifier,
				type,
				failedCount,
				blockedUntil
			})

			return true
		}

		return false
	}

	/**
	 * Record a login attempt
	 */
	async recordAttempt(identifier: string, success: boolean, metadata?: any): Promise<void> {
		const key = `login:${identifier.toLowerCase()}`

		await prisma.rateLimitAttempt.create({
			data: {
				key,
				success,
				blocked: false,
				metadata: metadata || {}
			}
		})

		logger.info('Login attempt recorded', { identifier, success })
	}

	/**
	 * Reset rate limit for an identifier (e.g., after successful login)
	 */
	async reset(identifier: string, type: 'login' = 'login'): Promise<void> {
		const key = `${type}:${identifier.toLowerCase()}`

		await prisma.rateLimitAttempt.deleteMany({
			where: { key }
		})

		logger.info('Rate limit reset', { identifier, type })
	}

	/**
	 * Cleanup old rate limit attempts
	 */
	async cleanup(): Promise<void> {
		const cutoff = new Date(Date.now() - this.config.windowMs * 2)

		const deleted = await prisma.rateLimitAttempt.deleteMany({
			where: {
				createdAt: { lt: cutoff }
			}
		})

		if (deleted.count > 0) {
			logger.info('Cleaned up old rate limit attempts', { count: deleted.count })
		}
	}

	/**
	 * Get remaining attempts before block
	 */
	async getRemainingAttempts(identifier: string): Promise<number> {
		const key = `login:${identifier.toLowerCase()}`
		const now = new Date()

		const recentAttempts = await prisma.rateLimitAttempt.count({
			where: {
				key,
				success: false,
				createdAt: {
					gte: new Date(now.getTime() - this.config.windowMs)
				}
			}
		})

		return Math.max(0, this.config.maxAttempts - recentAttempts)
	}

	/**
	 * Get block expiry time for a blocked identifier
	 * Returns null if not blocked, or Date when block expires
	 */
	async getBlockExpiry(identifier: string): Promise<Date | null> {
		const key = `login:${identifier.toLowerCase()}`
		const now = new Date()

		const blockedAttempt = await prisma.rateLimitAttempt.findFirst({
			where: {
				key,
				blocked: true,
				blockedUntil: {
					gt: now
				}
			},
			orderBy: { createdAt: 'desc' },
			select: { blockedUntil: true }
		})

		return blockedAttempt?.blockedUntil || null
	}

	/**
	 * Get remaining block time in minutes
	 */
	async getRemainingBlockMinutes(identifier: string): Promise<number> {
		const expiry = await this.getBlockExpiry(identifier)
		if (!expiry) return 0

		const now = new Date()
		const remainingMs = expiry.getTime() - now.getTime()
		return Math.ceil(remainingMs / (60 * 1000))
	}
}
