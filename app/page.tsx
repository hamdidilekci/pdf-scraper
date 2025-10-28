import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'

export default async function HomePage() {
	const session = await getServerSession(authOptions)

	if (!session) {
		return (
			<div className="space-y-4">
				<h1 className="text-2xl font-semibold">Welcome</h1>
				<p>Please sign in to access the app.</p>
				<div className="flex gap-3">
					<Link href="/sign-in" className="rounded bg-blue-600 px-3 py-2 text-white">
						Sign in
					</Link>
					<Link href="/sign-up" className="rounded border border-blue-600 px-3 py-2 text-blue-600">
						Sign up
					</Link>
				</div>
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
