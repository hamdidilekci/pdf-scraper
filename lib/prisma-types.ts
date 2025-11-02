import { type Session } from 'next-auth'
import prisma from './prisma'

// Prisma Client Type
export type PrismaClientType = typeof prisma

// Helper to assert session has userId (throws if not)
export function requireUserId(session: Session | null): string {
	if (!session || !session.user) {
		throw new Error('Session does not contain user ID')
	}
	const user = session.user as { id?: string }
	if (!user.id) {
		throw new Error('Session does not contain user ID')
	}
	return user.id
}
