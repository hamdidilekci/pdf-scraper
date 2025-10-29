import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'

export default async function HomePage() {
	const session = await getServerSession(authOptions)

	if (!session) {
		return (
			<div className="space-y-8">
				<section className="relative overflow-hidden rounded-xl border">
					<Image
						src="/hero.jpg"
						alt="AI robot processing PDF documents"
						width={1600}
						height={900}
						className="h-72 w-full object-cover"
						priority
						unoptimized
					/>
					<div className="absolute inset-0 bg-gradient-to-t from-background/80 to-background/10" />
					<div className="absolute inset-x-0 bottom-0 p-6">
						<h1 className="text-2xl font-semibold">Extract data from PDFs with AI</h1>
						<p className="mt-1 text-sm text-muted-foreground">Sign in to start uploading and parsing your files.</p>
						<div className="mt-4 flex gap-3">
							<Button asChild>
								<Link href="/sign-in">Sign in</Link>
							</Button>
							<Button asChild variant="outline">
								<Link href="/sign-up">Create account</Link>
							</Button>
						</div>
					</div>
				</section>
			</div>
		)
	}

	return (
		<div className="space-y-2">
			<h1 className="text-2xl font-semibold">Dashboard</h1>
			<p>You are signed in as {session.user?.email}</p>
		</div>
	)
}
