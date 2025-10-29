import Link from 'next/link'
import prisma from '@/lib/prisma'

export default async function ResumesPage() {
	const items: any[] = await (prisma as any).resume.findMany({
		orderBy: { uploadedAt: 'desc' },
		select: { id: true, fileName: true, uploadedAt: true, status: true }
	})

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">Your Resumes</h1>
				<Link href="/upload" className="rounded bg-blue-600 px-3 py-2 text-white">
					Upload New
				</Link>
			</div>
			<div className="rounded border bg-white p-6">
				{items.length === 0 ? (
					<p className="text-sm text-gray-700">No resumes yet. Upload your first PDF.</p>
				) : (
					<ul className="divide-y">
						{items.map((it: any) => (
							<li key={it.id} className="flex items-center justify-between py-3 text-sm">
								<div>
									<p className="font-medium">{it.fileName}</p>
									<p className="text-gray-600">
										{new Date(it.uploadedAt).toLocaleString()} · {it.status}
									</p>
								</div>
								<Link href={`/resumes/${it.id}`} className="rounded border px-3 py-1">
									View
								</Link>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	)
}
