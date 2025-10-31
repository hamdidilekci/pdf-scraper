import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import { badRequest, conflict, serverError } from '@/lib/api-errors'
import { created } from '@/lib/api-response'
import { logger } from '@/lib/logger'

const schema = z.object({
	email: z.string().email(),
	password: z.string().min(8),
	name: z.string().min(1).optional()
})

export async function POST(request: Request) {
	try {
		const json = await request.json()
		const parsed = schema.safeParse(json)

		if (!parsed.success) {
			return badRequest('Invalid input', parsed.error.errors)
		}

		const email = parsed.data.email.toLowerCase()
		const exists = await prisma.user.findUnique({ where: { email } })

		if (exists) {
			return conflict('Email already in use')
		}

		const hashedPassword = await bcrypt.hash(parsed.data.password, 10)
		await prisma.user.create({
			data: {
				email,
				name: parsed.data.name || null,
				hashedPassword
			}
		})

		return created({ ok: true })
	} catch (error) {
		logger.error('Registration error', error, { endpoint: '/api/auth/register' })
		return serverError('Registration failed')
	}
}