import prisma from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import { badRequest, conflict, serverError } from '@/lib/api-errors'
import { created } from '@/lib/api-response'
import { logger } from '@/lib/logger'

const schema = z.object({
	email: z.string().email(),
	password: z.string().min(8)
})

export async function POST(request: Request) {
	try {
		const json = await request.json()
		const parsed = schema.safeParse(json)

		if (!parsed.success) {
			const errorDetails = parsed.error.errors.map((err) => {
				if (err.path.includes('email')) return 'Please enter a valid email address'
				if (err.path.includes('password')) return 'Password must be at least 8 characters long'
				return err.message
			})
			throw badRequest(errorDetails.join('. '), parsed.error.errors)
		}

		const email = parsed.data.email.toLowerCase()
		const exists = await prisma.user.findUnique({ where: { email } })

		if (exists) {
			logger.warn('Email already in use', { email })
			throw conflict('An account with this email already exists. Please sign in instead')
		}

		const hashedPassword = await bcrypt.hash(parsed.data.password, 10)
		logger.info('Creating user', { email })
		await prisma.user.create({
			data: {
				email,
				hashedPassword,
				credits: 0 // Start with 0 credits - user must subscribe to get credits
			}
		})

		return created({ ok: true })
	} catch (error) {
		logger.error('Registration error', error, { endpoint: '/api/auth/register' })
		throw serverError('We could not create your account right now. Please try again')
	}
}
