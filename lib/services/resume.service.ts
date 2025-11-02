import prisma from '@/lib/prisma'
import { Prisma, ResumeStatus } from '@prisma/client'
import { logger } from '@/lib/logger'

export interface ListResumesParams {
	userId: string
	status?: string
	search?: string
	limit?: number
}

export interface ListResumesResult {
	items: Array<{
		id: string
		fileName: string
		uploadedAt: Date
		status: ResumeStatus
	}>
}

export interface CreateResumeParams {
	userId: string
	fileName: string
	storagePath: string
}

export interface UpdateResumeParams {
	id: string
	userId: string
	status?: ResumeStatus
	resumeData?: any
	error?: string | null
}

export class ResumeService {
	async list(params: ListResumesParams): Promise<ListResumesResult> {
		const { userId, status, search, limit = 20 } = params

		const where: Prisma.ResumeWhereInput = { userId }

		if (status && status !== 'ALL') {
			where.status = status as ResumeStatus
		}

		if (search) {
			where.fileName = {
				contains: search,
				mode: 'insensitive'
			}
		}

		const orderBy: Prisma.ResumeOrderByWithRelationInput = { uploadedAt: 'desc' }

		const items = await prisma.resume.findMany({
			where,
			orderBy,
			take: limit,
			select: {
				id: true,
				fileName: true,
				uploadedAt: true,
				status: true
			}
		})

		return {
			items
		}
	}

	async findById(id: string, userId: string) {
		return prisma.resume.findFirst({
			where: { id, userId },
			include: { histories: true }
		})
	}

	async findByStoragePath(storagePath: string, userId: string) {
		return prisma.resume.findFirst({
			where: { userId, storagePath }
		})
	}

	async create(params: CreateResumeParams) {
		try {
			return await prisma.resume.create({
				data: {
					userId: params.userId,
					fileName: params.fileName,
					storagePath: params.storagePath,
					status: 'PENDING'
				}
			})
		} catch (error) {
			logger.error('Failed to create resume record', error, { userId: params.userId, fileName: params.fileName })
			throw error
		}
	}

	async update(params: UpdateResumeParams) {
		return prisma.resume.update({
			where: { id: params.id },
			data: {
				status: params.status,
				resumeData: params.resumeData,
				error: params.error
			}
		})
	}

	async getDashboardStats(userId: string) {
		const [totalResumes, recentCount, statusBreakdown, recentUploads] = await Promise.all([
			prisma.resume.count({ where: { userId } }),
			prisma.resume.count({
				where: {
					userId,
					uploadedAt: {
						gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
					}
				}
			}),
			prisma.resume.groupBy({
				by: ['status'],
				where: { userId },
				_count: true
			}),
			prisma.resume.findMany({
				where: { userId },
				orderBy: { uploadedAt: 'desc' },
				take: 5,
				select: {
					id: true,
					fileName: true,
					uploadedAt: true,
					status: true
				}
			})
		])

		const completedCount = statusBreakdown.find((item) => item.status === 'COMPLETED')?._count || 0
		const successRate = totalResumes > 0 ? Math.round((completedCount / totalResumes) * 100) : 0
		const pendingCount = statusBreakdown.find((item) => item.status === 'PENDING')?._count || 0

		return {
			totalResumes,
			recentCount,
			successRate,
			pendingCount,
			recentUploads
		}
	}

	async delete(id: string, userId: string): Promise<{ storagePath: string }> {
		// Verify ownership and get storage path
		const resume = await prisma.resume.findFirst({
			where: { id, userId },
			select: { storagePath: true }
		})

		if (!resume) {
			logger.warn('Attempted to delete resume that does not exist or belongs to another user', { id, userId })
			throw new Error('Resume not found or you do not have permission to delete it')
		}

		// Delete resume (cascades to ResumeHistory via Prisma schema)
		await prisma.resume.delete({
			where: { id }
		})

		logger.info('Resume deleted', { id, userId, storagePath: resume.storagePath })

		return { storagePath: resume.storagePath }
	}
}
