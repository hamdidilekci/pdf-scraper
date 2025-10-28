import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcrypt'

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
			return NextResponse.json({ message: 'Invalid input' }, { status: 400 })
		}

		const email = parsed.data.email.toLowerCase()
		const exists = await prisma.user.findUnique({ where: { email } })
		if (exists) {
			return NextResponse.json({ message: 'Email already in use' }, { status: 409 })
		}

		const hashedPassword = await bcrypt.hash(parsed.data.password, 10)
		await prisma.user.create({
			data: {
				email,
				name: parsed.data.name || null,
				hashedPassword
			}
		})

		return NextResponse.json({ ok: true }, { status: 201 })
	} catch (err) {
		return NextResponse.json({ message: 'Server error' }, { status: 500 })
	}
}
