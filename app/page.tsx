import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function HomePage() {
	const session = await getServerSession(authOptions)

	if (!session) {
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
								<Button asChild size="lg" className="w-full sm:w-auto">
									<Link href="/sign-in">Sign in</Link>
								</Button>
								<Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
									<Link href="/sign-up">Create account</Link>
								</Button>
							</div>
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
