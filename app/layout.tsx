import '@/styles/globals.css'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Providers from '@/components/Providers'
import SignOutButton from '@/components/SignOutButton'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
	title: 'PDF Scraper App',
	description: 'Upload PDFs and extract structured data'
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
	const session = await getServerSession(authOptions)

	return (
		<html lang="en">
			<body>
				<Providers>
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
									</>
								)}
								{session ? (
									<>
										<span className="text-sm text-gray-600">{session.user?.email}</span>
										<SignOutButton />
									</>
								) : (
									<>
										<Link href="/sign-in" className="text-sm text-blue-600 hover:underline">
											Sign in
										</Link>
										<Link href="/sign-up" className="text-sm text-blue-600 hover:underline">
											Sign up
										</Link>
									</>
								)}
							</div>
						</div>
					</nav>
					<main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
					<Toaster position="top-right" richColors />
				</Providers>
			</body>
		</html>
	)
}
