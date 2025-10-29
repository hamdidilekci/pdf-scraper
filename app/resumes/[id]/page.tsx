type Props = { params: { id: string } }

export default function ResumeDetailPage({ params }: Props) {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Resume Detail</h1>
				<p className="text-sm text-gray-600">ID: {params.id}</p>
			</div>
			<div className="rounded border bg-white p-6">
				<p className="text-sm text-gray-700">
					We will display the extracted JSON here once the API and database are wired. Youll be able to copy and download it.
				</p>
			</div>
		</div>
	)
}
