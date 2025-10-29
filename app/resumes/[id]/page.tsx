import prisma from '@/lib/prisma'
import JsonViewer from '@/components/JsonViewer'

type Props = { params: { id: string } }

export default async function ResumeDetailPage({ params }: Props) {
	const item: any = await (prisma as any).resume.findUnique({ where: { id: params.id } })

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Resume Detail</h1>
				<p className="text-sm text-gray-600">ID: {params.id}</p>
			</div>
			<div className="rounded border bg-white p-6">
				{item?.resumeData ? <JsonViewer data={item.resumeData as any} /> : <p className="text-sm text-gray-700">No extracted data found yet.</p>}
			</div>
		</div>
	)
}
