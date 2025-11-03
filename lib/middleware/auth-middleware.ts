import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { unauthorized } from '@/lib/api-errors'

export interface AuthenticatedContext {
	userId: string
}

/**
 * Helper to get authenticated user ID from session.
 * Returns null if not authenticated.
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
	const session = await getServerSession(authOptions)
	if (!session) return null

	try {
		const user = session.user as { id?: string }
		if (!user.id) {
			throw new Error('Session does not contain user ID')
		}
		return user.id
	} catch {
		return null
	}
}

/**
 * Helper that throws if user is not authenticated.
 * Use this in route handlers after checking session.
 */
export async function requireAuthenticatedUser(): Promise<string> {
	const userId = await getAuthenticatedUserId()
	if (!userId) {
		throw unauthorized()
	}
	return userId
}
