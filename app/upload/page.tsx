import Link from 'next/link'
import UploadDropzone from '@/components/UploadDropzone'
import { Button } from '@/components/ui/button'

export default function UploadPage() {
	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">Upload a PDF</h1>
					<p className="text-sm text-gray-600">Max size 10MB. Only PDF files are accepted.</p>
				</div>
				<Link href="/resumes">
					<Button variant="outline">View Resumes</Button>
				</Link>
			</div>
			<UploadDropzone />
		</div>
	)
}
