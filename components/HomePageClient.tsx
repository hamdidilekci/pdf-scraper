'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import DashboardClient from './DashboardClient'

export default function HomePageClient() {
	const { data: session, status } = useSession()
	const router = useRouter()

	useEffect(() => {
		if (status === 'loading') return // Still loading

		if (session) {
			// User is signed in, redirect to dashboard
			router.replace('/')
		}
	}, [session, status, router])

	if (status === 'loading') {
		return (
			<div className="flex items-center justify-center min-h-[50vh]">
				<div className="flex items-center gap-2">
					<div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
					<span className="text-sm text-gray-600">Loading...</span>
				</div>
			</div>
		)
	}

	if (session) {
		// Show dashboard for authenticated users
		return <DashboardClient />
	}

	// Show landing page for unauthenticated users
	return (
		<div className="flex flex-col">
			<section
				className="relative min-h-[50vh] md:min-h-[60vh] lg:min-h-[80vh] w-full overflow-hidden rounded-xl border mb-8"
				style={{
					backgroundImage: 'url(/hero.jpg)',
					backgroundSize: 'cover',
					backgroundPosition: 'center top',
					backgroundRepeat: 'no-repeat'
				}}
			>
				<div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/40 to-background/10" />
				<div className="relative h-full flex flex-col justify-end">
					<div className="p-6 md:p-8 lg:p-12 pb-8 md:pb-12 lg:pb-16">
						<h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-foreground mb-2 md:mb-3">Extract data from PDFs with AI</h1>
						<p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6 font-semibold">
							Sign in to start uploading and parsing your files.
						</p>
						<div className="flex flex-col sm:flex-row gap-3 md:gap-4">
							<Button onClick={() => router.push('/sign-in')}>Sign in</Button>
							<Button variant="outline" onClick={() => router.push('/sign-up')}>
								Create account
							</Button>
						</div>
					</div>
				</div>
			</section>
		</div>
	)
}
