import { Skeleton } from '@/components/ui/skeleton'

export function PdfViewerSkeleton() {
	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<Skeleton className="h-6 w-32" />
				<Skeleton className="h-8 w-24" />
			</div>
			<div className="border rounded-lg overflow-hidden">
				<Skeleton className="w-full h-96" />
			</div>
		</div>
	)
}
