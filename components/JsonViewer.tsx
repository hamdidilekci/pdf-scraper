'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

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
			toast.success('Downloaded JSON')
		} catch {
			toast.error('Download failed')
		}
	}, [json])

	if (loading) {
		return (
			<div className="space-y-3">
				<div className="flex gap-3">
					<Skeleton className="h-8 w-16" />
					<Skeleton className="h-8 w-20" />
				</div>
				<div className="space-y-2">
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-3/4" />
					<Skeleton className="h-4 w-1/2" />
					<Skeleton className="h-4 w-5/6" />
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-3">
			<div className="flex gap-3">
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
