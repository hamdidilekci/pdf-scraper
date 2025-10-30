'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { getSupabaseClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
// PdfClientRenderer removed in Responses flow

// Server-side PDF processing - no client-side extraction needed

type Step = 'idle' | 'uploading' | 'extracting' | 'done' | 'error'

export default function UploadDropzone() {
	const [dragOver, setDragOver] = useState(false)
	const [file, setFile] = useState<File | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [step, setStep] = useState<Step>('idle')
	const inputRef = useRef<HTMLInputElement>(null)
	const [storagePath, setStoragePath] = useState<string | null>(null)
	const [batchProgress, setBatchProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 })

	const onSelect = useCallback((f: File) => {
		setError(null)
		// file selected
		if (f.type !== 'application/pdf') {
			setError('Only PDF files are supported')
			toast.error('Only PDF files are supported')
			return
		}
		const maxBytes = 10 * 1024 * 1024
		if (f.size > maxBytes) {
			setError('File exceeds 10MB limit')
			toast.error('File exceeds 10MB limit')
			return
		}
		setFile(f)
		toast.success('File ready to upload')
	}, [])

	const onDrop = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault()
			setDragOver(false)
			const f = e.dataTransfer.files?.[0]
			if (f) onSelect(f)
		},
		[onSelect]
	)

	const onBrowse = useCallback(() => {
		inputRef.current?.click()
	}, [])

	const reset = useCallback(() => {
		setFile(null)
		setError(null)
		setStep('idle')
	}, [])

	const canSubmit = useMemo(() => !!file && step !== 'uploading' && step !== 'extracting', [file, step])

	const start = useCallback(async () => {
		if (!file) return
		setError(null)
		try {
			setStep('uploading')
			toast.info('Requesting upload URL…')
			// requesting signed upload
			const signedRes = await fetch('/api/storage/signed-url', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ fileName: file.name, contentType: 'application/pdf' })
			})
			if (!signedRes.ok) {
				console.error('[Upload] Failed to get signed upload URL', signedRes.status)
				throw new Error('Failed to get upload URL')
			}
			const { bucket, storagePath, token } = await signedRes.json()
			// signed upload received
			setStoragePath(storagePath)

			const supabase = getSupabaseClient()
			toast.info('Uploading to storage…')
			// uploading to storage
			const { error: upErr } = await supabase.storage.from(bucket).uploadToSignedUrl(storagePath, token, file, {
				contentType: 'application/pdf'
			})
			if (upErr) {
				console.error('[Upload] Storage upload failed:', upErr)
				throw upErr
			}
			console.log('[Upload] Storage upload successful')

			// Directly invoke Responses API based extraction
			setStep('extracting')
			toast.info('Sending PDF to OpenAI…')
			const resp = await fetch('/api/extract/responses', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ storagePath })
			})
			if (!resp.ok) {
				const body = await resp.json().catch(() => ({}))
				throw new Error(body?.message || 'OpenAI extraction failed')
			}
			toast.success('Extraction complete')
			setStep('done')
			setTimeout(() => {
				window.location.href = '/resumes'
			}, 1200)
		} catch (err: any) {
			setStep('error')
			const msg = err?.message || 'Unexpected error'
			setError(msg)
			toast.error(msg)
		}
	}, [file])

	// No client-side rendering in Responses flow

	return (
		<div className="space-y-4">
			<div
				onDragOver={(e) => {
					e.preventDefault()
					setDragOver(true)
				}}
				onDragLeave={() => setDragOver(false)}
				onDrop={onDrop}
				className={`flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded border border-dashed ${
					dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'
				}`}
				onClick={onBrowse}
			>
				<p className="text-sm">Drag & drop your PDF here, or click to browse</p>
				<p className="mt-1 text-xs text-gray-500">Max 10MB</p>
				<input
					ref={inputRef}
					type="file"
					accept="application/pdf"
					className="hidden"
					onChange={(e) => {
						const f = e.target.files?.[0]
						if (f) onSelect(f)
					}}
				/>
			</div>

			{file && (
				<div className="rounded border bg-white p-3 text-sm">
					<p className="font-medium">Selected:</p>
					<p className="text-gray-700">
						{file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
					</p>
				</div>
			)}

			{error && <p className="text-sm text-red-600">{error}</p>}

			{/* Rendering removed */}

			{step === 'extracting' && (
				<p className="text-sm text-gray-700">
					Sending to AI… batch {batchProgress.done} / {batchProgress.total}
				</p>
			)}

			<div className="flex gap-3">
				<Button onClick={start} disabled={!canSubmit}>
					{step === 'uploading' || step === 'extracting' ? (
						<>
							<svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
								<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
								<path
									className="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
							{step === 'uploading' ? 'Uploading…' : 'Extracting…'}
						</>
					) : (
						'Start'
					)}
				</Button>
				{(file || step !== 'idle') && (
					<Button variant="outline" onClick={reset}>
						Reset
					</Button>
				)}
			</div>

			{step === 'done' && <p className="text-sm text-green-700">Upload and extraction complete. You can view it in your dashboard.</p>}
			{step === 'error' && <p className="text-sm text-red-700">An error occurred. Backend endpoints may not be ready yet.</p>}
		</div>
	)
}
