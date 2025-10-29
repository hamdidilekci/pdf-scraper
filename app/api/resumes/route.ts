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
	const items = await (prisma as any).resume.findMany({
		where: { userId },
		orderBy: { uploadedAt: 'desc' },
		select: { id: true, fileName: true, uploadedAt: true, status: true }
	})
	return NextResponse.json({ items })
}
