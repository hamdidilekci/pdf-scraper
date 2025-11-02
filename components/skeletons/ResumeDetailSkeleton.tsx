import { Skeleton } from '@/components/ui/skeleton'

export function ResumeDetailSkeleton() {
	return (
		<div className="space-y-6">
			{/* Breadcrumbs */}
			<nav className="flex items-center space-x-2 text-sm text-gray-600">
				<Skeleton className="h-4 w-12" />
				<Skeleton className="h-4 w-4" />
				<Skeleton className="h-4 w-16" />
				<Skeleton className="h-4 w-4" />
				<Skeleton className="h-4 w-24" />
			</nav>

			{/* Title and Status */}
			<div className="flex items-center justify-between">
				<Skeleton className="h-8 w-64" />
				<div className="flex items-center space-x-2">
					<Skeleton className="h-6 w-20 rounded-full" />
					<Skeleton className="h-4 w-16" />
				</div>
			</div>

			{/* Side-by-side layout */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Left column - PDF Preview */}
				<div className="space-y-4">
					<Skeleton className="h-96 w-full rounded-lg border" />

					{/* File metadata */}
					<div className="bg-gray-50 rounded-lg p-4">
						<Skeleton className="h-5 w-32 mb-3" />
						<div className="space-y-2">
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-3/4" />
							<Skeleton className="h-4 w-1/2" />
						</div>
					</div>
				</div>

				{/* Right column - Extracted Data */}
				<div className="space-y-4">
					<Skeleton className="h-7 w-32" />
					<div className="rounded border bg-white p-6">
						<div className="space-y-3">
							<div className="flex gap-3">
								<Skeleton className="h-8 w-16" />
								<Skeleton className="h-8 w-20" />
							</div>
							<div className="space-y-2">
								<Skeleton className="h-4 w-full" />
								<Skeleton className="h-4 w-5/6" />
								<Skeleton className="h-4 w-4/5" />
								<Skeleton className="h-4 w-full" />
								<Skeleton className="h-4 w-3/4" />
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
