import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import prisma from '@/lib/prisma'

export default async function HomePage() {
	const session = await getServerSession(authOptions)

	if (!session) {
		return (
			<div className="flex flex-col">
				<section
					className="relative min-h-[50vh] md:min-h-[60vh] lg:min-h-[80vh] w-full overflow-hidden rounded-xl border mb-8"
					style={{
						backgroundImage: 'url(/hero.jpg)',
						backgroundSize: 'cover',
						backgroundPosition: 'center top',
						backgroundRepeat: 'no-repeat'
					}}
				>
					<div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/40 to-background/10" />
					<div className="relative h-full flex flex-col justify-end">
						<div className="p-6 md:p-8 lg:p-12 pb-8 md:pb-12 lg:pb-16">
							<h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-foreground mb-2 md:mb-3">Extract data from PDFs with AI</h1>
							<p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6 font-semibold">
								Sign in to start uploading and parsing your files.
							</p>
							<div className="flex flex-col sm:flex-row gap-3 md:gap-4">
								<Link href="/sign-in" className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
									Sign in
								</Link>
								<Link href="/sign-up" className="rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50">
									Create account
								</Link>
							</div>
						</div>
					</div>
				</section>
			</div>
		)
	}

	const userId = (session.user as any)?.id as string

	// Fetch dashboard statistics
	const [totalResumes, recentCount, statusBreakdown, recentUploads] = await Promise.all([
		// Total resumes
		(prisma as any).resume.count({ where: { userId } }),

		// Recent uploads (last 7 days)
		(prisma as any).resume.count({
			where: {
				userId,
				uploadedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
			}
		}),

		// Status breakdown
		(prisma as any).resume.groupBy({
			by: ['status'],
			where: { userId },
			_count: true
		}),

		// Recent uploads list
		(prisma as any).resume.findMany({
			where: { userId },
			orderBy: { uploadedAt: 'desc' },
			take: 5,
			select: { id: true, fileName: true, uploadedAt: true, status: true }
		})
	])

	// Calculate success rate
	const completedCount = statusBreakdown.find((item: any) => item.status === 'COMPLETED')?._count || 0
	const failedCount = statusBreakdown.find((item: any) => item.status === 'FAILED')?._count || 0
	const successRate = totalResumes > 0 ? Math.round((completedCount / totalResumes) * 100) : 0

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">Dashboard</h1>
					<p className="text-sm text-gray-600">Welcome back, {session.user?.email}</p>
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
							<p className="text-2xl font-semibold text-gray-900">{totalResumes}</p>
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
							<p className="text-2xl font-semibold text-gray-900">{recentCount}</p>
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
							<p className="text-2xl font-semibold text-gray-900">{successRate}%</p>
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
							<p className="text-2xl font-semibold text-gray-900">{statusBreakdown.find((item: any) => item.status === 'PENDING')?._count || 0}</p>
							<p className="text-xs text-gray-500">Pending</p>
						</div>
					</div>
				</div>
			</div>

			{/* Quick Actions */}
			<div className="bg-white rounded-lg border p-6">
				<h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
				<div className="flex flex-col sm:flex-row gap-3">
					<Link href="/upload" className="inline-flex items-center justify-center rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
						<svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
						</svg>
						Upload New Resume
					</Link>
					<Link
						href="/resumes"
						className="inline-flex items-center justify-center rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
					>
						<svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
							/>
						</svg>
						View All Resumes
					</Link>
				</div>
			</div>

			{/* Recent Uploads */}
			<div className="bg-white rounded-lg border p-6">
				<h2 className="text-lg font-semibold mb-4">Recent Uploads</h2>
				{recentUploads.length === 0 ? (
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
						{recentUploads.map((upload: any) => (
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
