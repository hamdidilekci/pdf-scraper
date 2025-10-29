'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

export default function Sidebar() {
	const pathname = usePathname()
	const { data: session } = useSession()

	const navLinks = [
		{ href: '/', label: 'Home' }
		// Add more app routes here as needed
	]

	return (
		<Sheet>
			<SheetTrigger asChild>
				<Button variant="outline" size="sm" className="sm:hidden">
					Menu
				</Button>
			</SheetTrigger>
			<SheetContent side="left" className="w-72">
				<SheetHeader>
					<SheetTitle>PDF Scraper</SheetTitle>
				</SheetHeader>
				<nav className="mt-6 grid gap-2">
					{navLinks.map((link) => (
						<Link
							key={link.href}
							href={link.href}
							className={pathname === link.href ? 'rounded-md bg-accent px-3 py-2 text-accent-foreground' : 'rounded-md px-3 py-2 hover:bg-accent'}
						>
							{link.label}
						</Link>
					))}
					<div className="pt-4">
						{session ? (
							<Button asChild className="w-full">
								<Link href="#" onClick={(e) => e.preventDefault()}>
									Use the top bar to sign out
								</Link>
							</Button>
						) : (
							<div className="grid gap-2">
								<Button asChild variant="ghost" className="w-full">
									<Link href="/sign-in">Sign in</Link>
								</Button>
								<Button asChild className="w-full">
									<Link href="/sign-up">Sign up</Link>
								</Button>
							</div>
						)}
					</div>
				</nav>
			</SheetContent>
		</Sheet>
	)
}
