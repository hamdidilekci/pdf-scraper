import Link from 'next/link'

export default function ResumesPage() {
	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">Your Resumes</h1>
				<Link href="/upload" className="rounded bg-blue-600 px-3 py-2 text-white">
					Upload New
				</Link>
			</div>
			<div className="rounded border bg-white p-6">
				<p className="text-sm text-gray-700">Your uploaded resumes will appear here once the backend endpoints are connected.</p>
				<p className="mt-2 text-sm text-gray-500">Well show file name, upload date, and status.</p>
			</div>
		</div>
	)
}
