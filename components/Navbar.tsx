'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import SignOutButton from '@/components/SignOutButton'

export default function Navbar() {
	const { data: session, status } = useSession()

	return (
		<nav className="border-b bg-white">
			<div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
				<Link href="/" className="font-semibold">
					PDF Scraper
				</Link>
				<div className="flex items-center gap-4">
					{session && (
						<>
							<Link href="/upload" className="text-sm text-gray-700 hover:text-gray-900">
								Upload
							</Link>
							<Link href="/resumes" className="text-sm text-gray-700 hover:text-gray-900">
								Resumes
							</Link>
							<Link href="/settings" className="text-sm text-gray-700 hover:text-gray-900">
								Settings
							</Link>
						</>
					)}
					{status === 'loading' ? (
						<div className="flex items-center gap-2">
							<div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
							<span className="text-sm text-gray-600">Loading...</span>
						</div>
					) : session ? (
						<div className="flex items-center gap-3">
							<span className="text-sm text-gray-600">{session.user?.email}</span>
							<SignOutButton />
						</div>
					) : (
						<div className="flex items-center gap-3">
							<Link href="/sign-in">
								<Button variant="ghost" size="sm">
									Sign in
								</Button>
							</Link>
							<Link href="/sign-up">
								<Button size="sm">Sign up</Button>
							</Link>
						</div>
					)}
				</div>
			</div>
		</nav>
	)
}
