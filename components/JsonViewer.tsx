'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { JsonViewerSkeleton } from '@/components/skeletons/JsonViewerSkeleton'

interface JsonViewerProps {
	data: unknown
	loading?: boolean
}

export default function JsonViewer({ data, loading = false }: JsonViewerProps) {
	const [collapsed, setCollapsed] = useState(false)
	const json = JSON.stringify(data, null, 2)

	const onCopy = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(json)
			toast.success('Resume data copied to clipboard')
		} catch {
			toast.error('Could not copy to clipboard. Please try again')
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
			toast.success('Resume data downloaded successfully')
		} catch {
			toast.error('Download failed. Please try again')
		}
	}, [json])

	if (loading) {
		return <JsonViewerSkeleton />
	}

	return (
		<div className="space-y-4">
			<div className="flex gap-3">
				<div className="flex items-center justify-between">
					<h3 className="text-base font-semibold">Extracted Data</h3>
				</div>
				<Button variant="outline" size="sm" onClick={onCopy}>
					<svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
						/>
					</svg>
					Copy
				</Button>
				<Button variant="outline" size="sm" onClick={onDownload}>
					<svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						/>
					</svg>
					Download
				</Button>
				<Button variant="outline" size="sm" onClick={() => setCollapsed(!collapsed)}>
					<svg className={`w-4 h-4 mr-2 transition-transform ${collapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
					</svg>
					{collapsed ? 'Expand' : 'Collapse'}
				</Button>
			</div>
			{!collapsed && <pre className="max-h-[60vh] overflow-auto rounded border bg-gray-50 p-4 text-sm font-mono leading-relaxed">{json}</pre>}
		</div>
	)
}
