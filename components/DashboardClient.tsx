'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface DashboardData {
	totalResumes: number
	recentCount: number
	successRate: number
	pendingCount: number
	recentUploads: Array<{
		id: string
		fileName: string
		uploadedAt: string
		status: string
	}>
}

export default function DashboardClient() {
	const [data, setData] = useState<DashboardData | null>(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const fetchDashboardData = async () => {
			try {
				const response = await fetch('/api/dashboard')
				if (response.ok) {
					const result = await response.json()
					if (result.success && result.data) {
						setData(result.data)
					} else {
						console.error('Invalid response format:', result)
					}
				}
			} catch (error) {
				console.error('Failed to fetch dashboard data:', error)
			} finally {
				setLoading(false)
			}
		}

		fetchDashboardData()
	}, [])

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<Skeleton className="h-8 w-48 mb-2" />
						<Skeleton className="h-4 w-32" />
					</div>
				</div>

				{/* Statistics Section Skeleton */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					{[...Array(4)].map((_, i) => (
						<div key={i} className="bg-white rounded-lg border p-6">
							<div className="flex items-center">
								<Skeleton className="p-2 rounded-lg w-10 h-10" />
								<div className="ml-4 flex-1">
									<Skeleton className="h-4 w-24 mb-2" />
									<Skeleton className="h-8 w-16" />
								</div>
							</div>
						</div>
					))}
				</div>

				{/* Quick Actions Skeleton */}
				<div className="bg-white rounded-lg border p-6">
					<Skeleton className="h-6 w-32 mb-4" />
					<div className="flex flex-col sm:flex-row gap-3">
						<Skeleton className="h-10 w-40" />
						<Skeleton className="h-10 w-40" />
					</div>
				</div>

				{/* Recent Uploads Skeleton */}
				<div className="bg-white rounded-lg border p-6">
					<Skeleton className="h-6 w-32 mb-4" />
					<div className="space-y-3">
						{[...Array(3)].map((_, i) => (
							<div key={i} className="flex items-center justify-between p-3 border rounded-lg">
								<div className="flex-1">
									<Skeleton className="h-5 w-48 mb-1" />
									<Skeleton className="h-4 w-32" />
								</div>
								<div className="flex items-center gap-3">
									<Skeleton className="h-6 w-16 rounded-full" />
									<Skeleton className="h-6 w-12" />
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		)
	}

	if (!data) {
		return (
			<div className="text-center py-12">
				<div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
					<svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z"
						/>
					</svg>
				</div>
				<h1 className="text-2xl font-semibold text-gray-900 mb-4">Error Loading Dashboard</h1>
				<p className="text-gray-600 mb-6">Unable to load dashboard data. Please try again.</p>
				<div className="flex flex-col sm:flex-row gap-3 justify-center">
					<Button onClick={() => window.location.reload()}>Refresh Page</Button>
					<Button
						variant="outline"
						onClick={() => {
							setLoading(true)
							setData(null)
							// Trigger re-fetch
							window.location.reload()
						}}
					>
						Try Again
					</Button>
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">Dashboard</h1>
					<p className="text-sm text-gray-600">Welcome back!</p>
				</div>
			</div>

			{/* Statistics Section */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<div className="bg-white rounded-lg border p-6">
					<div className="flex items-center">
						<div className="p-2 bg-blue-100 rounded-lg">
							<svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
								/>
							</svg>
						</div>
						<div className="ml-4">
							<p className="text-sm font-medium text-gray-600">Total Resumes</p>
							<p className="text-2xl font-semibold text-gray-900">{data.totalResumes}</p>
						</div>
					</div>
				</div>

				<div className="bg-white rounded-lg border p-6">
					<div className="flex items-center">
						<div className="p-2 bg-green-100 rounded-lg">
							<svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
						<div className="ml-4">
							<p className="text-sm font-medium text-gray-600">Recent Uploads</p>
							<p className="text-2xl font-semibold text-gray-900">{data.recentCount}</p>
							<p className="text-xs text-gray-500">Last 7 days</p>
						</div>
					</div>
				</div>

				<div className="bg-white rounded-lg border p-6">
					<div className="flex items-center">
						<div className="p-2 bg-yellow-100 rounded-lg">
							<svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
						<div className="ml-4">
							<p className="text-sm font-medium text-gray-600">Success Rate</p>
							<p className="text-2xl font-semibold text-gray-900">{data.successRate}%</p>
						</div>
					</div>
				</div>

				<div className="bg-white rounded-lg border p-6">
					<div className="flex items-center">
						<div className="p-2 bg-purple-100 rounded-lg">
							<svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
								/>
							</svg>
						</div>
						<div className="ml-4">
							<p className="text-sm font-medium text-gray-600">Processing</p>
							<p className="text-2xl font-semibold text-gray-900">{data.pendingCount}</p>
							<p className="text-xs text-gray-500">Pending</p>
						</div>
					</div>
				</div>
			</div>

			{/* Quick Actions */}
			<div className="bg-white rounded-lg border p-6">
				<h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
				<div className="flex flex-col sm:flex-row gap-3">
					<Link href="/upload">
						<Button className="inline-flex items-center">
							<svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
							</svg>
							Upload New Resume
						</Button>
					</Link>
					<Link href="/resumes">
						<Button variant="outline" className="inline-flex items-center">
							<svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
								/>
							</svg>
							View All Resumes
						</Button>
					</Link>
				</div>
			</div>

			{/* Recent Uploads */}
			<div className="bg-white rounded-lg border p-6">
				<h2 className="text-lg font-semibold mb-4">Recent Uploads</h2>
				{data.recentUploads.length === 0 ? (
					<div className="text-center py-8">
						<svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
							/>
						</svg>
						<p className="text-gray-500 mb-4">No resumes uploaded yet</p>
						<Link href="/upload" className="text-blue-600 hover:underline">
							Upload your first resume
						</Link>
					</div>
				) : (
					<div className="space-y-3">
						{data.recentUploads.map((upload) => (
							<div key={upload.id} className="flex items-center justify-between p-3 border rounded-lg">
								<div className="flex-1">
									<p className="font-medium text-gray-900">{upload.fileName}</p>
									<p className="text-sm text-gray-500">{new Date(upload.uploadedAt).toLocaleString()}</p>
								</div>
								<div className="flex items-center gap-3">
									<span
										className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
											upload.status === 'COMPLETED'
												? 'bg-green-100 text-green-800'
												: upload.status === 'PENDING'
												? 'bg-yellow-100 text-yellow-800'
												: 'bg-red-100 text-red-800'
										}`}
									>
										{upload.status}
									</span>
									<Link href={`/resumes/${upload.id}`} className="text-blue-600 hover:underline text-sm">
										View
									</Link>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	)
}
