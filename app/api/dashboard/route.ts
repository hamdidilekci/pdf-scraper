import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
	const session = await getServerSession(authOptions)

	if (!session || !(session.user as any)?.id) {
		return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
	}

	const userId = (session.user as any).id as string

	try {
		// Fetch dashboard statistics
		const [totalResumes, recentCount, statusBreakdown, recentUploads] = await Promise.all([
			// Total resumes
			(prisma as any).resume.count({ where: { userId } }),

			// Recent uploads (last 7 days)
			(prisma as any).resume.count({
				where: {
					userId,
					uploadedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
				}
			}),

			// Status breakdown
			(prisma as any).resume.groupBy({
				by: ['status'],
				where: { userId },
				_count: true
			}),

			// Recent uploads list
			(prisma as any).resume.findMany({
				where: { userId },
				orderBy: { uploadedAt: 'desc' },
				take: 5,
				select: { id: true, fileName: true, uploadedAt: true, status: true }
			})
		])

		// Calculate success rate
		const completedCount = statusBreakdown.find((item: any) => item.status === 'COMPLETED')?._count || 0
		const failedCount = statusBreakdown.find((item: any) => item.status === 'FAILED')?._count || 0
		const successRate = totalResumes > 0 ? Math.round((completedCount / totalResumes) * 100) : 0
		const pendingCount = statusBreakdown.find((item: any) => item.status === 'PENDING')?._count || 0

		return NextResponse.json({
			totalResumes,
			recentCount,
			successRate,
			pendingCount,
			recentUploads
		})
	} catch (error) {
		console.error('Dashboard API error:', error)
		return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
	}
}
