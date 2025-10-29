import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

type Params = { params: { id: string } }

export async function GET(_: Request, { params }: Params) {
	const session = await getServerSession(authOptions)
	if (!session || !(session.user as any)?.id) {
		return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
	}
	const userId = (session.user as any).id as string
	const item = await (prisma as any).resume.findFirst({
		where: { id: params.id, userId },
		include: { histories: true }
	})
	if (!item) return NextResponse.json({ message: 'Not found' }, { status: 404 })
	return NextResponse.json({ item })
}
