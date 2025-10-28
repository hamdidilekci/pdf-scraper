import type { NextAuthOptions } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import prisma from './prisma'
import bcrypt from 'bcrypt'

export const authOptions: NextAuthOptions = {
	adapter: PrismaAdapter(prisma),
	session: {
		strategy: 'jwt'
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

				const user = await prisma.user.findUnique({
					where: { email: credentials.email.toLowerCase() }
				})
				if (!user || !user.hashedPassword) {
					return null
				}
				const valid = await bcrypt.compare(credentials.password, user.hashedPassword)
				if (!valid) {
					return null
				}
				return { id: user.id, email: user.email, name: user.name || undefined }
			}
		})
	],
	callbacks: {
		async jwt({ token, user }) {
			if (user) {
				token.id = (user as any).id
			}
			return token
		},
		async session({ session, token }) {
			if (session.user && token?.id) {
				;(session.user as any).id = token.id as string
			}
			return session
		}
	}
}
