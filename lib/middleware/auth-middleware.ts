import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireUserId } from '@/lib/prisma-types'
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
		return requireUserId(session)
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
		throw new Error('Unauthorized')
	}
	return userId
}
