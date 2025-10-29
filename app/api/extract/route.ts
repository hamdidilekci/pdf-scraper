import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getSupabaseAdmin, getBucketName } from '@/lib/supabase'
import { getOpenAI } from '@/lib/openai'
import { extractionSystemPrompt } from '@/lib/prompt'
import { resumeJsonSchema } from '@/lib/types'

export async function POST(request: Request) {
	const session = await getServerSession(authOptions)
	if (!session || !(session.user as any)?.id) {
		return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
	}
	const userId = (session.user as any).id as string

	try {
		const body = await request.json()
		const storagePath: string | undefined = body?.storagePath
		if (!storagePath) {
			return NextResponse.json({ message: 'storagePath required' }, { status: 400 })
		}

		let resumeRecord = await (prisma as any).resume.create({
			data: {
				userId,
				fileName: storagePath?.split('/').pop() || 'unknown.pdf',
				storagePath: storagePath || '',
				status: 'PENDING'
			}
		})

		const history = await (prisma as any).resumeHistory.create({
			data: {
				resumeId: resumeRecord.id,
				inputType: 'TEXT',
				model: 'gpt-4o-mini',
				status: 'PENDING'
			}
		})

		// For now, we'll use a placeholder approach since PDF parsing libraries are having webpack issues
		// In production, you'd want to use a proper PDF parsing service or library
		const contentText = `This is a placeholder for PDF text extraction. 
		
		In a production environment, you would:
		1. Download the PDF from Supabase Storage
		2. Use a proper PDF parsing library (like pdf-parse, pdf2pic, or a cloud service)
		3. Extract the actual text content
		4. Process it with OpenAI
		
		For now, this demonstrates the flow with sample resume data:
		
		John Doe
		Full Stack Developer
		Email: john.doe@email.com
		Phone: (555) 123-4567
		
		EXPERIENCE:
		- Frontend Developer at Tech Company (2020-2023)
		  * Built React applications
		  * Worked with TypeScript and Next.js
		
		EDUCATION:
		- Bachelor of Science in Computer Science
		  University of Technology (2016-2020)
		
		SKILLS:
		- JavaScript, TypeScript, React, Next.js
		- Node.js, Express, MongoDB
		- AWS, Docker, Git`

		// Update the resume record to indicate this is a demo/placeholder
		await (prisma as any).resume.update({
			where: { id: resumeRecord.id },
			data: {
				status: 'PENDING',
				error: 'Using placeholder text - PDF parsing not yet implemented'
			}
		})

		const openai = getOpenAI()
		const userPrompt = `Extract structured resume data as JSON that exactly matches the schema keys. If data is missing, use empty strings or nulls where applicable.\n\nCONTENT:\n${contentText}`

		const completion = await openai.chat.completions.create({
			model: 'gpt-4o-mini',
			messages: [
				{ role: 'system', content: extractionSystemPrompt },
				{ role: 'user', content: userPrompt }
			],
			response_format: { type: 'json_object' },
			temperature: 0
		})

		const raw = completion.choices?.[0]?.message?.content || '{}'
		let parsed: any
		try {
			parsed = JSON.parse(raw)
		} catch {
			parsed = {}
		}

		const validated = resumeJsonSchema.safeParse(parsed)
		if (!validated.success) {
			console.error('Schema validation failed:', validated.error)
			console.error('Raw OpenAI response:', raw)
			console.error('Parsed JSON:', parsed)

			await (prisma as any).resume.update({
				where: { id: resumeRecord.id },
				data: {
					status: 'FAILED',
					error: `Schema validation failed: ${validated.error.issues.map((i) => i.message).join(', ')}`
				}
			})
			await (prisma as any).resumeHistory.update({
				where: { id: history.id },
				data: {
					status: 'FAILED',
					error: 'Schema validation failed',
					rawResponse: parsed
				}
			})
			return NextResponse.json(
				{
					message: 'Extraction failed schema validation',
					details: validated.error.issues.map((i) => i.message)
				},
				{ status: 422 }
			)
		}

		resumeRecord = await (prisma as any).resume.update({
			where: { id: resumeRecord.id },
			data: { status: 'COMPLETED', resumeData: validated.data }
		})
		await (prisma as any).resumeHistory.update({ where: { id: history.id }, data: { status: 'COMPLETED' } })

		return NextResponse.json({ ok: true, resumeId: resumeRecord.id })
	} catch (err) {
		return NextResponse.json({ message: 'Server error' }, { status: 500 })
	}
}
