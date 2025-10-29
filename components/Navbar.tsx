import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import SignOutButton from '@/components/SignOutButton'
import Sidebar from '@/components/Sidebar'
import { Button } from '@/components/ui/button'

export default async function Navbar() {
	const session = await getServerSession(authOptions)

	return (
		<nav className="border-b bg-background">
			<div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
				<div className="flex items-center gap-3">
					<Sidebar />
					<Link href="/" className="font-semibold">
						PDF Scraper
					</Link>
				</div>
				<div className="flex items-center gap-3">
					{session ? (
						<>
							<span className="hidden text-sm text-muted-foreground sm:inline">{session.user?.email}</span>
							<SignOutButton />
						</>
					) : (
						<>
							<Button asChild variant="ghost" size="sm">
								<Link href="/sign-in">Sign in</Link>
							</Button>
							<Button asChild size="sm">
								<Link href="/sign-up">Sign up</Link>
							</Button>
						</>
					)}
				</div>
			</div>
		</nav>
	)
}
