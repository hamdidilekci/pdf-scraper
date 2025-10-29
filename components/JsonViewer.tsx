'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'

export default function JsonViewer({ data }: { data: unknown }) {
	const json = JSON.stringify(data, null, 2)

	const onCopy = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(json)
			toast.success('Copied JSON')
		} catch {
			toast.error('Copy failed')
		}
	}, [json])

	const onDownload = useCallback(() => {
		try {
			const blob = new Blob([json], { type: 'application/json' })
			const url = URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = 'resume.json'
			document.body.appendChild(a)
			a.click()
			a.remove()
			URL.revokeObjectURL(url)
		} catch {
			toast.error('Download failed')
		}
	}, [json])

	return (
		<div className="space-y-3">
			<div className="flex gap-3">
				<button onClick={onCopy} className="rounded border px-3 py-2 text-sm">
					Copy
				</button>
				<button onClick={onDownload} className="rounded border px-3 py-2 text-sm">
					Download
				</button>
			</div>
			<pre className="max-h-[60vh] overflow-auto rounded border bg-gray-50 p-3 text-xs">{json}</pre>
		</div>
	)
}
