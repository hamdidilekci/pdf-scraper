import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

export class CreditService {
	/**
	 * Check if user has sufficient credits
	 * @returns true if user has enough credits, false otherwise
	 */
	async checkCredits(userId: string, requiredCredits: number): Promise<boolean> {
		try {
			const user = await prisma.user.findUnique({
				where: { id: userId },
				select: { credits: true }
			})

			if (!user) {
				logger.warn('User not found for credit check', { userId })
				return false
			}

			return user.credits >= requiredCredits
		} catch (error) {
			logger.error('Error checking credits', error, { userId, requiredCredits })
			return false
		}
	}

	/**
	 * Deduct credits from user account
	 * Uses transaction to ensure atomicity
	 */
	async deductCredits(userId: string, amount: number): Promise<void> {
		try {
			await prisma.$transaction(async (tx) => {
				const user = await tx.user.findUnique({
					where: { id: userId },
					select: { credits: true, id: true }
				})

				if (!user) {
					throw new Error(`User not found: ${userId}`)
				}

				if (user.credits < amount) {
					throw new Error(`Insufficient credits: ${user.credits} < ${amount}`)
				}

				await tx.user.update({
					where: { id: userId },
					data: { credits: { decrement: amount } }
				})

				logger.info('Credits deducted', {
					userId,
					amount,
					remainingCredits: user.credits - amount
				})
			})
		} catch (error) {
			logger.error('Error deducting credits', error, { userId, amount })
			throw error
		}
	}

	/**
	 * Add credits to user account
	 * Uses transaction to ensure atomicity
	 */
	async addCredits(userId: string, amount: number): Promise<void> {
		try {
			await prisma.$transaction(async (tx) => {
				const user = await tx.user.findUnique({
					where: { id: userId },
					select: { credits: true, id: true }
				})

				if (!user) {
					throw new Error(`User not found: ${userId}`)
				}

				const updatedUser = await tx.user.update({
					where: { id: userId },
					data: { credits: { increment: amount } }
				})

				logger.info('Credits added', {
					userId,
					amount,
					newBalance: updatedUser.credits
				})
			})
		} catch (error) {
			logger.error('Error adding credits', error, { userId, amount })
			throw error
		}
	}

	/**
	 * Get current credit balance for user
	 */
	async getCredits(userId: string): Promise<number> {
		try {
			const user = await prisma.user.findUnique({
				where: { id: userId },
				select: { credits: true }
			})

			if (!user) {
				logger.warn('User not found for getCredits', { userId })
				return 0
			}

			return user.credits
		} catch (error) {
			logger.error('Error getting credits', error, { userId })
			return 0
		}
	}
}
