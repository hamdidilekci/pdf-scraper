'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

interface ResumeItem {
	id: string
	fileName: string
	uploadedAt: string
	status: string
}

interface ResumesData {
	items: ResumeItem[]
	hasMore: boolean
	nextCursor?: string
}

export default function ResumesClient() {
	const { data: session, status } = useSession()
	const [data, setData] = useState<ResumesData | null>(null)
	const [loading, setLoading] = useState(true)
	const [searchTerm, setSearchTerm] = useState('')
	const [statusFilter, setStatusFilter] = useState('ALL')
	const [cursor, setCursor] = useState<string | undefined>()

	const fetchResumes = useCallback(async () => {
		try {
			setLoading(true)
			const params = new URLSearchParams()
			if (cursor) params.set('cursor', cursor)
			if (statusFilter !== 'ALL') params.set('status', statusFilter)
			if (searchTerm) params.set('search', searchTerm)

			const response = await fetch(`/api/resumes?${params.toString()}`)
			if (response.ok) {
				const result = await response.json()
				if (result.success && result.data) {
					setData(result.data)
				} else {
					console.error('Invalid response format:', result)
				}
			}
		} catch (error) {
			console.error('Failed to fetch resumes:', error)
		} finally {
			setLoading(false)
		}
	}, [cursor, statusFilter, searchTerm])

	useEffect(() => {
		if (status === 'loading') return

		if (!session) {
			setLoading(false)
			return
		}

		fetchResumes()
	}, [session, status, fetchResumes])

	const handleSearch = (value: string) => {
		setSearchTerm(value)
		setCursor(undefined) // Reset pagination
		// Debounce search
		const timeoutId = setTimeout(() => {
			fetchResumes()
		}, 500)
		return () => clearTimeout(timeoutId)
	}

	const handleStatusFilter = (status: string) => {
		setStatusFilter(status)
		setCursor(undefined) // Reset pagination
		fetchResumes()
	}

	const loadMore = () => {
		if (data?.hasMore && data?.nextCursor) {
			setCursor(data.nextCursor)
		}
	}

	if (status === 'loading') {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<Skeleton className="h-8 w-32" />
					<Skeleton className="h-10 w-24" />
				</div>
				<div className="space-y-4">
					<div className="flex gap-4">
						<Skeleton className="h-10 w-64" />
						<Skeleton className="h-10 w-32" />
					</div>
					<div className="rounded border bg-white p-6">
						<div className="space-y-3">
							{[...Array(5)].map((_, i) => (
								<div key={i} className="flex items-center justify-between py-3">
									<div className="flex-1">
										<Skeleton className="h-5 w-48 mb-1" />
										<Skeleton className="h-4 w-32" />
									</div>
									<Skeleton className="h-8 w-16" />
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		)
	}

	if (!session) {
		return (
			<div className="text-center py-12">
				<h1 className="text-2xl font-semibold text-gray-900 mb-4">Access Denied</h1>
				<p className="text-gray-600 mb-6">Please sign in to view your resumes.</p>
				<Link href="/sign-in" className="text-blue-600 hover:underline">
					Sign in
				</Link>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">Your Resumes</h1>
				<Link href="/upload">
					<Button>Upload New</Button>
				</Link>
			</div>

			{/* Filters */}
			<div className="flex flex-col sm:flex-row gap-4">
				<div className="flex-1">
					<Input placeholder="Search by filename..." value={searchTerm} onChange={(e) => handleSearch(e.target.value)} className="max-w-md" />
				</div>
				<div className="flex gap-2">
					<Button variant={statusFilter === 'ALL' ? 'default' : 'outline'} size="sm" onClick={() => handleStatusFilter('ALL')}>
						All
					</Button>
					<Button variant={statusFilter === 'COMPLETED' ? 'default' : 'outline'} size="sm" onClick={() => handleStatusFilter('COMPLETED')}>
						Completed
					</Button>
					<Button variant={statusFilter === 'PENDING' ? 'default' : 'outline'} size="sm" onClick={() => handleStatusFilter('PENDING')}>
						Pending
					</Button>
					<Button variant={statusFilter === 'FAILED' ? 'default' : 'outline'} size="sm" onClick={() => handleStatusFilter('FAILED')}>
						Failed
					</Button>
				</div>
			</div>

			{/* Results */}
			<div className="rounded border bg-white p-6">
				{loading ? (
					<div className="space-y-3">
						{[...Array(5)].map((_, i) => (
							<div key={i} className="flex items-center justify-between py-3">
								<div className="flex-1">
									<Skeleton className="h-5 w-48 mb-1" />
									<Skeleton className="h-4 w-32" />
								</div>
								<Skeleton className="h-8 w-16" />
							</div>
						))}
					</div>
				) : !data?.items || data.items.length === 0 ? (
					<div className="text-center py-8">
						<svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
							/>
						</svg>
						<p className="text-gray-500 mb-4">
							{searchTerm || statusFilter !== 'ALL' ? 'No resumes match your filters' : 'No resumes yet. Upload your first PDF.'}
						</p>
						{!searchTerm && statusFilter === 'ALL' && (
							<Link href="/upload" className="text-blue-600 hover:underline">
								Upload your first resume
							</Link>
						)}
					</div>
				) : (
					<>
						<ul className="divide-y">
							{data.items.map((item) => (
								<li key={item.id} className="flex items-center justify-between py-3 text-sm">
									<div>
										<p className="font-medium">{item.fileName}</p>
										<p className="text-gray-600">
											{new Date(item.uploadedAt).toLocaleString()} ·
											<span
												className={`ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
													item.status === 'COMPLETED'
														? 'bg-green-100 text-green-800'
														: item.status === 'PENDING'
														? 'bg-yellow-100 text-yellow-800'
														: 'bg-red-100 text-red-800'
												}`}
											>
												{item.status}
											</span>
										</p>
									</div>
									<Link href={`/resumes/${item.id}`}>
										<Button variant="outline" size="sm">
											View
										</Button>
									</Link>
								</li>
							))}
						</ul>

						{/* Load More Button */}
						{data.hasMore && (
							<div className="mt-4 text-center">
								<Button variant="outline" onClick={loadMore} disabled={loading}>
									{loading ? 'Loading...' : 'Load More'}
								</Button>
							</div>
						)}
					</>
				)}
			</div>
		</div>
	)
}
