'use client'

import * as React from 'react'
import {
	ColumnDef,
	ColumnFiltersState,
	SortingState,
	VisibilityState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable
} from '@tanstack/react-table'
import { ArrowUpDown, MoreHorizontal, Eye, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from '@/components/ui/alert-dialog'

export interface ResumeItem {
	id: string
	fileName: string
	uploadedAt: Date | string
	status: 'PENDING' | 'COMPLETED' | 'FAILED'
}

interface ResumesDataTableProps {
	data: ResumeItem[]
	onDelete: (id: string) => Promise<void>
	onRefresh?: () => void
}

const getStatusBadgeClass = (status: string) => {
	switch (status) {
		case 'COMPLETED':
			return 'bg-green-100 text-green-800'
		case 'PENDING':
			return 'bg-yellow-100 text-yellow-800'
		case 'FAILED':
			return 'bg-red-100 text-red-800'
		default:
			return 'bg-gray-100 text-gray-800'
	}
}

export function ResumesDataTable({ data, onDelete, onRefresh }: ResumesDataTableProps) {
	const [sorting, setSorting] = React.useState<SortingState>([])
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
	const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
	const [resumeToDelete, setResumeToDelete] = React.useState<ResumeItem | null>(null)
	const [isDeleting, setIsDeleting] = React.useState(false)

	const handleDeleteClick = (resume: ResumeItem) => {
		setResumeToDelete(resume)
		setDeleteDialogOpen(true)
	}

	const handleDeleteConfirm = async () => {
		if (!resumeToDelete) return

		try {
			setIsDeleting(true)
			await onDelete(resumeToDelete.id)
			toast.success('Resume deleted successfully')
			setDeleteDialogOpen(false)
			setResumeToDelete(null)
			if (onRefresh) {
				onRefresh()
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Failed to delete resume'
			toast.error(errorMessage)
		} finally {
			setIsDeleting(false)
		}
	}

	const columns: ColumnDef<ResumeItem>[] = [
		{
			accessorKey: 'fileName',
			header: ({ column }) => {
				return (
					<Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="h-8 px-2">
						File Name
						<ArrowUpDown className="ml-2 h-4 w-4" />
					</Button>
				)
			},
			cell: ({ row }) => <div className="font-medium">{row.getValue('fileName')}</div>
		},
		{
			accessorKey: 'status',
			header: 'Status',
			cell: ({ row }) => {
				const status = row.getValue('status') as string
				return (
					<span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadgeClass(status)}`}>{status}</span>
				)
			}
		},
		{
			accessorKey: 'uploadedAt',
			header: ({ column }) => {
				return (
					<Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="h-8 px-2">
						Uploaded
						<ArrowUpDown className="ml-2 h-4 w-4" />
					</Button>
				)
			},
			cell: ({ row }) => {
				const date = row.getValue('uploadedAt') as Date | string
				const dateObj = typeof date === 'string' ? new Date(date) : date
				return <div className="text-gray-600">{dateObj.toLocaleString()}</div>
			}
		},
		{
			id: 'actions',
			header: 'Actions',
			enableHiding: false,
			cell: ({ row }) => {
				const resume = row.original

				return (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" className="h-8 w-8 p-0">
								<span className="sr-only">Open menu</span>
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem asChild>
								<Link href={`/resumes/${resume.id}`} className="flex items-center cursor-pointer">
									<Eye className="mr-2 h-4 w-4" />
									View
								</Link>
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => handleDeleteClick(resume)} className="text-red-600">
								<Trash2 className="mr-2 h-4 w-4" />
								Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				)
			}
		}
	]

	const table = useReactTable({
		data,
		columns,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		onColumnVisibilityChange: setColumnVisibility,
		state: {
			sorting,
			columnFilters,
			columnVisibility
		}
	})

	return (
		<>
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									return (
										<TableHead key={header.id}>
											{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
										</TableHead>
									)
								})}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell colSpan={columns.length} className="h-24 text-center">
									No results.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
			<div className="flex items-center justify-end space-x-2 py-4">
				<div className="flex-1 text-sm text-muted-foreground">{table.getFilteredRowModel().rows.length} row(s) total</div>
				<div className="space-x-2">
					<Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
						Previous
					</Button>
					<Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
						Next
					</Button>
				</div>
			</div>

			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Are you sure?</AlertDialogTitle>
						<AlertDialogDescription>
							This action cannot be undone. This will permanently delete the resume <span className="font-semibold">{resumeToDelete?.fileName}</span>{' '}
							and all associated data.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
							{isDeleting ? 'Deleting...' : 'Delete'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}
