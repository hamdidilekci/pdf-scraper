import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
	const session = await getServerSession(authOptions)
	if (!session || !(session.user as any)?.id) {
		return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
	}

	const { searchParams } = new URL(request.url)
	const cursor = searchParams.get('cursor')
	const status = searchParams.get('status')
	const search = searchParams.get('search')
	const limit = parseInt(searchParams.get('limit') || '20')

	const userId = (session.user as any).id as string

	// Build where clause
	const where: any = { userId }

	if (status && status !== 'ALL') {
		where.status = status
	}

	if (search) {
		where.fileName = {
			contains: search,
			mode: 'insensitive'
		}
	}

	// Build cursor pagination
	const orderBy = { uploadedAt: 'desc' as const }
	const take = limit + 1 // Take one extra to check if there are more

	let items
	if (cursor) {
		// Parse cursor (assuming it's the uploadedAt timestamp)
		const cursorDate = new Date(cursor)
		items = await(prisma as any).resume.findMany({
			where: {
				...where,
				uploadedAt: {
					lt: cursorDate
				}
			},
			orderBy,
			take,
			select: { id: true, fileName: true, uploadedAt: true, status: true }
		})
	} else {
		items = await(prisma as any).resume.findMany({
			where,
			orderBy,
			take,
			select: { id: true, fileName: true, uploadedAt: true, status: true }
		})
	}

	// Check if there are more items
	const hasMore = items.length > limit
	if (hasMore) {
		items = items.slice(0, limit)
	}

	// Generate next cursor
	const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].uploadedAt.toISOString() : undefined

	return NextResponse.json({
		items,
		hasMore,
		nextCursor
	})
}
