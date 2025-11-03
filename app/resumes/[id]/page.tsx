import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireAuthenticatedUser } from '@/lib/middleware/auth-middleware'
import { ResumeService } from '@/lib/services/resume.service'
import JsonViewer from '@/components/JsonViewer'
import PdfViewer from '@/components/PdfViewer'
import { Button } from '@/components/ui/button'

type Props = { params: { id: string } }

export default async function ResumeDetailPage({ params }: Props) {
	const session = await getServerSession(authOptions)

	if (!session) {
		return (
			<div className="text-center py-12">
				<h1 className="text-2xl font-semibold text-gray-900 mb-4">Sign In Required</h1>
				<p className="text-gray-600 mb-6">Please sign in to view this resume.</p>
				<Link href="/sign-in" className="text-blue-600 hover:underline">
					Sign in
				</Link>
			</div>
		)
	}

	const userId = await requireAuthenticatedUser()
	const resumeService = new ResumeService()
	const item = await resumeService.findById(params.id, userId)

	if (!item) {
		return (
			<div className="space-y-6">
				<div className="text-center py-12">
					<h1 className="text-2xl font-semibold text-gray-900 mb-4">Resume Not Found</h1>
					<p className="text-gray-600 mb-6">
						The resume you are looking for could not be found. It may have been deleted or you may not have permission to view it.
					</p>
					<Link href="/resumes">
						<Button className="inline-flex items-center">
							<svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
							</svg>
							Back to Resumes
						</Button>
					</Link>
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			{/* Breadcrumbs */}
			<nav className="flex items-center space-x-2 text-sm text-gray-600">
				<Link href="/" className="hover:text-gray-900">
					Home
				</Link>
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
				</svg>
				<Link href="/resumes" className="hover:text-gray-900">
					Resumes
				</Link>
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
				</svg>
				<span className="text-gray-900 font-medium max-w-xs">Resume Detail</span>
			</nav>

			{/* Side-by-side layout */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Left column - PDF Preview */}
				<div className="rounded border bg-white p-6">
					<PdfViewer storagePath={item.storagePath} fileName={item.fileName} />

					{/* File metadata */}
					<div className="bg-gray-50 rounded-lg p-4">
						<h3 className="text-sm font-medium text-gray-900 mb-2">File Information</h3>
						<div className="space-y-1 text-sm text-gray-600">
							<p>
								<span className="font-medium">Uploaded:</span> {new Date(item.uploadedAt).toLocaleString()}
							</p>
							<p>
								<span className="font-medium">Status:</span> {item.status}
							</p>
							{item.error && (
								<p>
									<span className="font-medium text-red-600">Error:</span> {item.error}
								</p>
							)}
						</div>
					</div>
				</div>

				{/* Right column - Extracted Data */}
				<div className="space-y-4">
					<div className="rounded border bg-white p-6">
						{item?.resumeData ? (
							<JsonViewer data={item.resumeData} />
						) : (
							<div className="text-center py-8">
								<svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
									/>
								</svg>
								<p className="text-gray-500 mb-2">No extracted data available</p>
								<p className="text-sm text-gray-400">
									{item.status === 'PENDING'
										? 'We are currently processing your resume. This may take a few moments...'
										: 'We could not extract information from this resume. Please try uploading it again'}
								</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}
