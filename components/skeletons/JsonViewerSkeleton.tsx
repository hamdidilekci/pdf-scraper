import { Skeleton } from '@/components/ui/skeleton'

export function JsonViewerSkeleton() {
	return (
		<div className="space-y-3">
			<div className="flex gap-3">
				<Skeleton className="h-8 w-16" />
				<Skeleton className="h-8 w-20" />
			</div>
			<div className="space-y-2">
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-3/4" />
				<Skeleton className="h-4 w-1/2" />
				<Skeleton className="h-4 w-5/6" />
			</div>
		</div>
	)
}
