import type { NextAuthOptions } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import prisma from './prisma'
import bcrypt from 'bcrypt'
import { RateLimitService } from './services/rate-limit.service'

interface ExtendedJWT {
	id?: string
}

interface ExtendedSessionUser {
	id: string
	email: string | null
	name?: string | null
}

export const authOptions: NextAuthOptions = {
	adapter: PrismaAdapter(prisma),
	session: {
		strategy: 'jwt',
		maxAge: 30 * 24 * 60 * 60 // 30 days
	},
	cookies: {
		sessionToken: {
			name: 'next-auth.session-token',
			options: {
				httpOnly: true,
				sameSite: 'lax',
				path: '/',
				secure: process.env.NODE_ENV === 'production'
			}
		}
	},
	pages: {
		signIn: '/sign-in'
	},
	providers: [
		Credentials({
			name: 'Credentials',
			credentials: {
				email: { label: 'Email', type: 'email' },
				password: { label: 'Password', type: 'password' }
			},
			async authorize(credentials) {
				if (!credentials?.email || !credentials?.password) return null

				const email = credentials.email.toLowerCase()
				const rateLimitService = new RateLimitService()

				// Check if user is rate limited
				const isBlocked = await rateLimitService.isBlocked(email)
				if (isBlocked) {
					const remainingMinutes = await rateLimitService.getRemainingBlockMinutes(email)
					// Throw error with specific message for blocked users
					throw new Error(`AccountBlocked:${remainingMinutes}`)
				}

				const user = await prisma.user.findUnique({
					where: { email }
				})

				if (!user || !user.hashedPassword) {
					// Record failed attempt
					await rateLimitService.recordAttempt(email, false, { reason: 'user_not_found' })
					return null
				}

				const valid = await bcrypt.compare(credentials.password, user.hashedPassword)
				if (!valid) {
					// Record failed attempt
					await rateLimitService.recordAttempt(email, false, { reason: 'invalid_password' })
					return null
				}

				// Successful login - reset rate limit
				await rateLimitService.recordAttempt(email, true)
				await rateLimitService.reset(email)

				return { id: user.id, email: user.email, name: user.name || undefined }
			}
		})
	],
	callbacks: {
		async jwt({ token, user }) {
			if (user) {
				;(token as ExtendedJWT).id = user.id
			}
			return token
		},
		async session({ session, token }) {
			if (session.user && (token as ExtendedJWT).id) {
				;(session.user as ExtendedSessionUser).id = (token as ExtendedJWT).id as string
			}
			return session
		}
	}
}
