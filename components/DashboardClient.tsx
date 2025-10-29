'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

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
					const dashboardData = await response.json()
					setData(dashboardData)
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
			<div className="flex items-center justify-center min-h-[50vh]">
				<div className="flex items-center gap-2">
					<div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
					<span className="text-sm text-gray-600">Loading dashboard...</span>
				</div>
			</div>
		)
	}

	if (!data) {
		return (
			<div className="text-center py-12">
				<h1 className="text-2xl font-semibold text-gray-900 mb-4">Error Loading Dashboard</h1>
				<p className="text-gray-600 mb-6">Unable to load dashboard data. Please try refreshing the page.</p>
				<Button onClick={() => window.location.reload()}>Refresh Page</Button>
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
