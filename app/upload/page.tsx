import UploadDropzone from '@/components/UploadDropzone'

export default function UploadPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Upload a PDF</h1>
				<p className="text-sm text-gray-600">Max size 10MB. Only PDF files are accepted.</p>
			</div>
			<UploadDropzone />
		</div>
	)
}
