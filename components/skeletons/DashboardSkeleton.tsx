import { Skeleton } from '@/components/ui/skeleton'

export function DashboardSkeleton() {
	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<Skeleton className="h-8 w-48 mb-2" />
					<Skeleton className="h-4 w-32" />
				</div>
			</div>

			{/* Statistics Section Skeleton */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				{[...Array(4)].map((_, i) => (
					<div key={i} className="bg-white rounded-lg border p-6">
						<div className="flex items-center">
							<Skeleton className="p-2 rounded-lg w-10 h-10" />
							<div className="ml-4 flex-1">
								<Skeleton className="h-4 w-24 mb-2" />
								<Skeleton className="h-8 w-16" />
							</div>
						</div>
					</div>
				))}
			</div>

			{/* Quick Actions Skeleton */}
			<div className="bg-white rounded-lg border p-6">
				<Skeleton className="h-6 w-32 mb-4" />
				<div className="flex flex-col sm:flex-row gap-3">
					<Skeleton className="h-10 w-40" />
					<Skeleton className="h-10 w-40" />
				</div>
			</div>

			{/* Recent Uploads Skeleton */}
			<div className="bg-white rounded-lg border p-6">
				<Skeleton className="h-6 w-32 mb-4" />
				<div className="space-y-3">
					{[...Array(3)].map((_, i) => (
						<div key={i} className="flex items-center justify-between p-3 border rounded-lg">
							<div className="flex-1">
								<Skeleton className="h-5 w-48 mb-1" />
								<Skeleton className="h-4 w-32" />
							</div>
							<div className="flex items-center gap-3">
								<Skeleton className="h-6 w-16 rounded-full" />
								<Skeleton className="h-6 w-12" />
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	)
}
