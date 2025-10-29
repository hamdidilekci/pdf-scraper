'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface PdfViewerProps {
	storagePath: string
	fileName: string
}

export default function PdfViewer({ storagePath, fileName }: PdfViewerProps) {
	const [pdfUrl, setPdfUrl] = useState<string | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		const fetchSignedUrl = async () => {
			try {
				const response = await fetch('/api/storage/signed-url', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						fileName: fileName,
						contentType: 'application/pdf',
						action: 'download',
						storagePath: storagePath
					})
				})

				if (!response.ok) {
					throw new Error('Failed to get PDF URL')
				}

				const { signedUrl } = await response.json()
				setPdfUrl(signedUrl)
			} catch (err) {
				console.error('Error fetching PDF URL:', err)
				setError('Failed to load PDF')
			} finally {
				setLoading(false)
			}
		}

		fetchSignedUrl()
	}, [storagePath, fileName])

	const handleDownload = () => {
		if (pdfUrl) {
			const link = document.createElement('a')
			link.href = pdfUrl
			link.download = fileName
			document.body.appendChild(link)
			link.click()
			document.body.removeChild(link)
		}
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg border">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
					<p className="text-sm text-gray-600">Loading PDF...</p>
				</div>
			</div>
		)
	}

	if (error || !pdfUrl) {
		return (
			<div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg border">
				<div className="text-center">
					<svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z"
						/>
					</svg>
					<p className="text-gray-600 mb-4">{error || 'PDF not found'}</p>
					<button onClick={() => window.location.reload()} className="text-blue-600 hover:underline text-sm">
						Try again
					</button>
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold">PDF Preview</h3>
				<button
					onClick={handleDownload}
					className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
				>
					<svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						/>
					</svg>
					Download PDF
				</button>
			</div>
			<div className="border rounded-lg overflow-hidden">
				<iframe src={pdfUrl} className="w-full h-96" title={`PDF Preview: ${fileName}`} />
			</div>
		</div>
	)
}
