'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { MAX_FILE_SIZE_MB } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

type Step = 'idle' | 'uploading' | 'extracting' | 'done' | 'error'

export default function UploadDropzone() {
	const [dragOver, setDragOver] = useState(false)
	const [file, setFile] = useState<File | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [step, setStep] = useState<Step>('idle')
	const inputRef = useRef<HTMLInputElement>(null)
	const [uploadProgress, setUploadProgress] = useState(0)

	const onSelect = useCallback((f: File) => {
		setError(null)
		// file selected
		if (f.type !== 'application/pdf') {
			const errorMsg = 'Please select a PDF file. Other file types are not supported'
			setError(errorMsg)
			toast.error(errorMsg)
			return
		}
		const maxBytes = 10 * 1024 * 1024
		if (f.size > maxBytes) {
			const errorMsg = `File size (${(f.size / (1024 * 1024)).toFixed(1)}MB) exceeds the ${MAX_FILE_SIZE_MB}MB limit. Please choose a smaller file`
			setError(errorMsg)
			toast.error(errorMsg)
			return
		}
		setFile(f)
		toast.success('PDF file selected and ready to upload')
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
		setUploadProgress(0)
	}, [])

	const canSubmit = useMemo(() => !!file && step !== 'uploading' && step !== 'extracting', [file, step])

	const start = useCallback(async () => {
		if (!file) return
		setError(null)
		setUploadProgress(0)

		try {
			setStep('uploading')
			toast.info('Preparing to upload your file...')

			// Step 1: Prepare upload URL (0-10%)
			setUploadProgress(5)
			const signedRes = await fetch('/api/storage/signed-url', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ fileName: file.name, contentType: 'application/pdf' })
			})
			const signedResult = await signedRes.json().catch(() => ({}))
			if (!signedRes.ok) {
				const errorMsg = signedResult?.error?.message || 'Could not prepare file for upload. Please try again'
				throw new Error(errorMsg)
			}
			setUploadProgress(10)

			const { storagePath, signedUrl } = signedResult.data

			// Step 2: Upload to storage (10-60%)
			toast.info('Uploading your file...')
			setUploadProgress(15)

			// Use XMLHttpRequest for real upload progress tracking
			await new Promise<void>((resolve, reject) => {
				const xhr = new XMLHttpRequest()

				xhr.upload.addEventListener('progress', (e) => {
					if (e.lengthComputable) {
						// Map upload progress (0-100%) to our range (10-60%)
						const uploadPercent = (e.loaded / e.total) * 100
						const mappedProgress = 10 + uploadPercent * 0.5 // 10% to 60%
						setUploadProgress(Math.round(mappedProgress))
					}
				})

				xhr.addEventListener('load', () => {
					if (xhr.status >= 200 && xhr.status < 300) {
						setUploadProgress(60)
						resolve()
					} else {
						reject(new Error(`Upload failed with status ${xhr.status}`))
					}
				})

				xhr.addEventListener('error', () => {
					reject(new Error('Upload failed. Please check your internet connection and try again'))
				})

				xhr.addEventListener('abort', () => {
					reject(new Error('Upload was cancelled'))
				})

				xhr.open('PUT', signedUrl)
				xhr.setRequestHeader('Content-Type', 'application/pdf')
				xhr.setRequestHeader('x-upsert', 'false')

				// Send file
				xhr.send(file)
			})

			// Step 3: Send to OpenAI (60-85%)
			setStep('extracting')
			setUploadProgress(65)
			toast.info('Analyzing your resume with AI...')

			const resp = await fetch('/api/extract/responses', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ storagePath })
			})
			setUploadProgress(75)

			const extractResult = await resp.json().catch(() => ({}))
			if (!resp.ok) {
				const errorMessage = extractResult?.error?.message || 'We could not extract information from your resume. Please try again'
				throw new Error(errorMessage)
			}

			// Step 4: Processing with AI (85-95%)
			setUploadProgress(85)

			// Verify successful extraction
			if (extractResult.success === false) {
				throw new Error(extractResult.error?.message || 'Extraction failed. Please try again')
			}

			// Step 5: Finalizing (95-100%)
			setUploadProgress(95)
			await new Promise((resolve) => setTimeout(resolve, 300))
			setUploadProgress(100)

			toast.success('Resume processed successfully! Redirecting...')
			setStep('done')
			setTimeout(() => {
				window.location.href = '/resumes'
			}, 800)
		} catch (err: any) {
			setStep('error')
			setUploadProgress(0)
			const msg = err?.message || 'An unexpected error occurred. Please try again'
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

			{(step === 'uploading' || step === 'extracting') && (
				<div className="space-y-2">
					<div className="flex items-center justify-between text-sm">
						<span className="text-gray-600">{step === 'uploading' ? 'Uploading file...' : 'Processing with AI...'}</span>
						<span className="font-medium text-gray-900">{uploadProgress}%</span>
					</div>
					<Progress value={uploadProgress} className="w-full" />
				</div>
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

			{step === 'done' && <p className="text-sm text-green-700">✓ Your resume has been uploaded and processed successfully!</p>}
			{step === 'error' && (
				<p className="text-sm text-red-700">
					We encountered an issue processing your resume. Please try again or contact support if the problem persists.
				</p>
			)}
		</div>
	)
}
