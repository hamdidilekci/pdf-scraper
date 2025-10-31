import { type Session } from 'next-auth'
import prisma from './prisma'

// Prisma Client Type
export type PrismaClientType = typeof prisma

// Session with userId (extended from next-auth Session)
export interface SessionWithUserId extends Session {
	user: {
		id: string
		email: string | null
		name?: string | null
	}
}

// Helper to check if session has userId and extract it
export function getUserIdFromSession(session: Session | null): string | null {
	if (!session || !session.user) {
		return null
	}
	const user = session.user as { id?: string }
	return user.id || null
}

// Helper to assert session has userId (throws if not)
export function requireUserId(session: Session | null): string {
	const userId = getUserIdFromSession(session)
	if (!userId) {
		throw new Error('Session does not contain user ID')
	}
	return userId
}

// Type guard to check if session has userId
export function hasUserId(session: Session | null): session is SessionWithUserId {
	return getUserIdFromSession(session) !== null
}
