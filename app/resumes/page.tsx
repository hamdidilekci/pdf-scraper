import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { Button } from '@/components/ui/button'

export default async function ResumesPage() {
	const session = await getServerSession(authOptions)

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

	const userId = (session.user as any)?.id as string
	const items: any[] = await(prisma as any).resume.findMany({
		where: { userId },
		orderBy: { uploadedAt: 'desc' },
		select: { id: true, fileName: true, uploadedAt: true, status: true }
	})

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">Your Resumes</h1>
				<Link href="/upload">
					<Button>Upload New</Button>
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
								<Link href={`/resumes/${it.id}`}>
									<Button variant="outline" size="sm">
										View
									</Button>
								</Link>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	)
}
