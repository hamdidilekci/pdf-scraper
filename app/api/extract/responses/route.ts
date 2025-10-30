import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getSupabaseAdmin, getBucketName } from '@/lib/supabase'
import { extractionSystemPrompt } from '@/lib/prompt'
import { resumeJsonSchema } from '@/lib/types'
import { normalizeResume } from '@/lib/normalizeResume'

export const runtime = 'nodejs'

type Body = {
	storagePath?: string
	model?: string
}

const RESPONSES_URL = 'https://api.openai.com/v1/responses'
const DEFAULT_MODEL = process.env.OPENAI_RESPONSES_MODEL || 'gpt-4.1'

export async function POST(req: Request) {
	const session = await getServerSession(authOptions)
	if (!session || !(session.user as any)?.id) {
		return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
	}
	if (!process.env.OPENAI_API_KEY) {
		return NextResponse.json({ message: 'OPENAI_API_KEY not configured' }, { status: 500 })
	}

	try {
		const body = (await req.json()) as Body
		const storagePath = body?.storagePath
		const requestedModel = (body?.model || DEFAULT_MODEL).trim()
		if (!storagePath) return NextResponse.json({ message: 'storagePath required' }, { status: 400 })

		const userId = (session.user as any).id as string
		const resume = await (prisma as any).resume.findFirst({ where: { userId, storagePath } })
		if (!resume) return NextResponse.json({ message: 'Not found' }, { status: 404 })

		// Download PDF bytes from Supabase
		const supabase = getSupabaseAdmin()
		const bucket = getBucketName()
		const decodedPath = decodeURIComponent(storagePath)
		const { data: fileResp, error } = await supabase.storage.from(bucket).download(decodedPath)
		if (error || !fileResp) return NextResponse.json({ message: 'Failed to download PDF' }, { status: 500 })
		const pdfArrayBuffer = await fileResp.arrayBuffer()

		// Create history (PENDING)
		const history = await (prisma as any).resumeHistory.create({
			data: {
				resumeId: resume.id,
				inputType: 'TEXT',
				model: requestedModel,
				status: 'PENDING',
				rawResponse: null
			}
		})

		// 1) Upload PDF to Files API
		const filesForm = new FormData()
		const fileName = resume.fileName || 'document.pdf'
		// Files API purpose must be one of: 'fine-tune', 'assistants', 'batch', 'user_data', 'vision', 'evals'
		// Use 'user_data' for Responses API file references
		filesForm.append('purpose', 'user_data')
		filesForm.append('file', new Blob([pdfArrayBuffer], { type: 'application/pdf' }), fileName)

		const filesResp = await fetch('https://api.openai.com/v1/files', {
			method: 'POST',
			headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
			body: filesForm
		})
		const filesRaw = await filesResp.text()
		// Files API result available in filesRaw if needed

		if (!filesResp.ok) {
			await (prisma as any).resumeHistory.update({
				where: { id: history.id },
				data: { status: 'FAILED', rawResponse: filesRaw?.slice(0, 2000) }
			})
			// Return minimal error surface
			return NextResponse.json({ message: 'OpenAI files error', details: filesRaw }, { status: filesResp.status })
		}
		let fileId: string = ''
		try {
			const filesJson = JSON.parse(filesRaw)
			fileId = filesJson?.id || ''
		} catch {}
		if (!fileId) {
			await (prisma as any).resumeHistory.update({
				where: { id: history.id },
				data: { status: 'FAILED', rawResponse: filesRaw?.slice(0, 2000) }
			})
			console.error('[responses] Failed to obtain file id from files API')
			return NextResponse.json({ message: 'Failed to obtain file id from files API' }, { status: 502 })
		}

		// 2) Call Responses API referencing uploaded file
		const responsesBody: any = {
			model: requestedModel,
			temperature: 0,
			text: { format: { type: 'json_object' } },
			input: [
				{
					role: 'user',
					content: [
						{ type: 'input_text', text: extractionSystemPrompt },
						// Use input_file for PDF references per Responses API
						{ type: 'input_file', file_id: fileId }
					]
				}
			]
		}

		const resp = await fetch(RESPONSES_URL, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(responsesBody)
		})
		const raw = await resp.text()
		// Responses API result available in raw if needed
		if (!resp.ok) {
			// Persist failure
			await (prisma as any).resume.update({
				where: { id: resume.id },
				data: { status: 'FAILED', error: `OpenAI error ${resp.status}: ${raw?.slice(0, 500)}` }
			})
			await (prisma as any).resumeHistory.update({
				where: { id: history.id },
				data: { status: 'FAILED', rawResponse: raw?.slice(0, 2000) }
			})
			console.error('[responses] OpenAI error (!resp.ok):', resp.status, raw?.slice(0, 500))
			return NextResponse.json({ message: 'OpenAI error', details: raw }, { status: resp.status })
		}

		// Try to extract output_text field; fallback to entire payload
		let parsedResponse: any
		try {
			parsedResponse = JSON.parse(raw)
		} catch {
			parsedResponse = { raw }
		}

		let outputText = ''
		// Heuristics for Responses object
		if (parsedResponse?.output_text) {
			outputText = parsedResponse.output_text
		} else if (Array.isArray(parsedResponse?.output)) {
			const firstText = parsedResponse.output.find((p: any) => p?.content?.[0]?.type === 'output_text')
			outputText = firstText?.content?.[0]?.text || ''
		}
		if (!outputText) {
			// As a last resort, try data.choices style
			outputText = parsedResponse?.choices?.[0]?.message?.content || raw
		}

		// Parse JSON from output
		let json: any = {}
		try {
			json = JSON.parse(outputText)
		} catch (e: any) {
			// Attempt a single remediation pass by re-prompting with validation error guidance
			const retryBody = {
				...responsesBody,
				input: [
					{
						role: 'user',
						content: [
							{
								type: 'input_text',
								text: `${extractionSystemPrompt}\nReturn ONLY a valid JSON object without markdown. If previous output was invalid, strictly follow the schema now.`
							},
							{ type: 'input_file', file_id: fileId }
						]
					}
				]
			}
			const retryResp = await fetch(RESPONSES_URL, {
				method: 'POST',
				headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
				body: JSON.stringify(retryBody)
			})
			const retryRaw = await retryResp.text()
			let retryParsed: any = {}
			try {
				retryParsed = JSON.parse(retryRaw)
			} catch {
				retryParsed = { raw: retryRaw }
			}
			let retryText = ''
			if (retryParsed?.output_text) retryText = retryParsed.output_text
			else if (Array.isArray(retryParsed?.output)) {
				const firstText = retryParsed.output.find((p: any) => p?.content?.[0]?.type === 'output_text')
				retryText = firstText?.content?.[0]?.text || ''
			}
			if (!retryText) retryText = retryParsed?.choices?.[0]?.message?.content || retryRaw
			try {
				json = JSON.parse(retryText)
			} catch {
				await (prisma as any).resume.update({
					where: { id: resume.id },
					data: { status: 'FAILED', error: 'Invalid JSON from model', resumeData: null }
				})
				await (prisma as any).resumeHistory.update({ where: { id: history.id }, data: { status: 'FAILED', rawResponse: retryParsed } })
				return NextResponse.json({ message: 'Invalid JSON from model' }, { status: 502 })
			}
		}

		// Normalize and validate against schema
		const normalized = normalizeResume(json)
		const validated = resumeJsonSchema.safeParse(normalized)
		if (!validated.success) {
			await (prisma as any).resume.update({
				where: { id: resume.id },
				data: { status: 'FAILED', error: `Schema validation failed`, resumeData: normalized }
			})
			await (prisma as any).resumeHistory.update({
				where: { id: history.id },
				data: { status: 'FAILED', rawResponse: parsedResponse, error: validated.error?.message?.slice(0, 1000) }
			})
			return NextResponse.json(
				{ message: 'Extraction failed schema validation', details: validated.error.issues.map((i) => i.message) },
				{ status: 422 }
			)
		}

		// Persist result
		await (prisma as any).resume.update({
			where: { id: resume.id },
			data: { status: 'COMPLETED', resumeData: validated.data, error: null }
		})

		// History success
		await (prisma as any).resumeHistory.update({
			where: { id: history.id },
			data: { status: 'COMPLETED', rawResponse: parsedResponse }
		})

		return NextResponse.json({ ok: true, resumeId: resume.id })
	} catch (err: any) {
		console.error('responses extract error:', err)
		return NextResponse.json({ message: 'Server error', details: err?.message || 'error' }, { status: 500 })
	}
}
