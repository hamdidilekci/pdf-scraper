import { Skeleton } from '@/components/ui/skeleton'

export function SettingsSkeleton() {
	return (
		<div className="space-y-6">
			<h1 className="text-2xl font-semibold">Settings</h1>
			<div className="rounded-lg border bg-white p-6 space-y-4">
				<Skeleton className="h-8 w-32" />
				<Skeleton className="h-12 w-full" />
				<Skeleton className="h-10 w-48" />
			</div>
		</div>
	)
}
