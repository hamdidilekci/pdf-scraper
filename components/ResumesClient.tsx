'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ResumesDataTable } from '@/components/ResumesDataTable'
import { ResumesTableSkeleton } from '@/components/skeletons/ResumesTableSkeleton'

interface ResumeItem {
	id: string
	fileName: string
	uploadedAt: string
	status: string
}

interface ResumesData {
	items: ResumeItem[]
}

export default function ResumesClient() {
	const { data: session, status } = useSession()
	const [data, setData] = useState<ResumesData | null>(null)
	const [loading, setLoading] = useState(true)
	const [deleting, setDeleting] = useState(false)
	const [searchTerm, setSearchTerm] = useState('')
	const [statusFilter, setStatusFilter] = useState('ALL')

	const fetchResumes = async () => {
		if (status === 'loading') return

		if (!session) {
			setLoading(false)
			return
		}

		try {
			setLoading(true)
			const params = new URLSearchParams()
			if (statusFilter !== 'ALL') params.set('status', statusFilter)
			if (searchTerm) params.set('search', searchTerm)

			const response = await fetch(`/api/resumes?${params.toString()}`)
			const result = await response.json().catch(() => ({}))
			if (response.ok) {
				if (result.success && result.data) {
					setData(result.data)
				} else {
					// Handle error response
					const errorMsg = result?.error?.message || 'We could not load your resumes. Please refresh the page'
					throw new Error(errorMsg)
				}
			} else {
				// Handle HTTP error
				const errorMsg = result?.error?.message || 'We could not load your resumes. Please try again'
				throw new Error(errorMsg)
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'We could not load your resumes. Please refresh the page'
			toast.error(errorMessage)
		} finally {
			setLoading(false)
		}
	};

	// Track if this is the initial mount
	const isInitialMount = useRef(true)

	// Initial fetch on mount
	useEffect(() => {
		if (isInitialMount.current) {
			isInitialMount.current = false
			fetchResumes()
		}

		setData(null) // Clear data immediately to prevent showing stale results
		fetchResumes()
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [statusFilter])

	const handleSearch = (value: string) => {
		setSearchTerm(value)
	}

	const handleSearchClick = () => {
		fetchResumes()
	}

	const handleStatusFilter = (status: string) => {
		setStatusFilter(status)
	}

	const handleDelete = async (id: string) => {
		try {
			setDeleting(true)
			const response = await fetch(`/api/resumes/${id}`, {
				method: 'DELETE'
			})

			const result = await response.json().catch(() => ({}))
			if (!response.ok) {
				const errorMsg = result?.error?.message || 'We could not delete the resume. Please try again'
				throw new Error(errorMsg)
			}

			// Refresh the list
			await fetchResumes()
		} finally {
			setDeleting(false)
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
					<ResumesTableSkeleton />
				</div>
			</div>
		)
	}

	if (!session) {
		return (
			<div className="text-center py-12">
				<h1 className="text-2xl font-semibold text-gray-900 mb-4">Sign In Required</h1>
				<p className="text-gray-600 mb-6">Please sign in to view and manage your resumes.</p>
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
				<div className="flex gap-2 flex-1">
					<Input
						placeholder="Search by filename..."
						value={searchTerm}
						onChange={(e) => handleSearch(e.target.value)}
						className="max-w-md flex-1"
						onKeyDown={(e) => {
							if (e.key === 'Enter') {
								handleSearchClick()
							}
						}}
					/>
					<Button
						onClick={handleSearchClick}
						className="px-4"
					>
						Search
					</Button>
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
			{loading || deleting ? (
				<ResumesTableSkeleton />
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
				<ResumesDataTable
					data={data.items.map((item) => ({
						id: item.id,
						fileName: item.fileName,
						uploadedAt: item.uploadedAt,
						status: item.status as 'PENDING' | 'COMPLETED' | 'FAILED'
					}))}
					onDelete={handleDelete}
					onRefresh={fetchResumes}
				/>
			)}
		</div>
	)
}
