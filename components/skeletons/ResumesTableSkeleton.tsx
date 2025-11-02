import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function ResumesTableSkeleton() {
	return (
		<div className="rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>
							<Skeleton className="h-4 w-24" />
						</TableHead>
						<TableHead>
							<Skeleton className="h-4 w-16" />
						</TableHead>
						<TableHead>
							<Skeleton className="h-4 w-32" />
						</TableHead>
						<TableHead>
							<Skeleton className="h-4 w-20" />
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{[...Array(5)].map((_, i) => (
						<TableRow key={i}>
							<TableCell>
								<Skeleton className="h-5 w-48" />
							</TableCell>
							<TableCell>
								<Skeleton className="h-6 w-20 rounded-full" />
							</TableCell>
							<TableCell>
								<Skeleton className="h-4 w-32" />
							</TableCell>
							<TableCell>
								<Skeleton className="h-8 w-8 rounded-md" />
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	)
}
