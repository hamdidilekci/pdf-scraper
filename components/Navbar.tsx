'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import SignOutButton from '@/components/SignOutButton'

export default function Navbar() {
	const { data: session, status } = useSession()

	return (
		<nav className="border-b bg-white">
			<div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 gap-2">
				<Link href="/" className="font-semibold text-sm sm:text-base whitespace-nowrap">
					PDF Scraper
				</Link>
				<div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-end">
					{session && (
						<>
							<Link href="/upload" className="text-xs sm:text-sm text-gray-700 hover:text-gray-900 whitespace-nowrap">
								Upload
							</Link>
							<Link href="/resumes" className="text-xs sm:text-sm text-gray-700 hover:text-gray-900 whitespace-nowrap">
								Resumes
							</Link>
							<Link href="/settings" className="text-xs sm:text-sm text-gray-700 hover:text-gray-900 whitespace-nowrap">
								Settings
							</Link>
						</>
					)}
					{status === 'loading' ? (
						<div className="flex items-center gap-2">
							<div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
							<span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">Loading...</span>
						</div>
					) : session ? (
						<div className="flex items-center gap-2 sm:gap-3">
							<span className="hidden sm:inline text-sm text-gray-600 truncate max-w-[120px] md:max-w-none">{session.user?.email}</span>
							<SignOutButton />
						</div>
					) : (
						<div className="flex items-center gap-2 sm:gap-3">
							<Link href="/sign-in">
								<Button variant="ghost" size="sm" className="text-xs sm:text-sm px-2 sm:px-4">
									Sign in
								</Button>
							</Link>
							<Link href="/sign-up">
								<Button size="sm" className="text-xs sm:text-sm px-2 sm:px-4">
									Sign up
								</Button>
							</Link>
						</div>
					)}
				</div>
			</div>
		</nav>
	)
}
