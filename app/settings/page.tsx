import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import SettingsClient from '@/components/SettingsClient'

export default async function SettingsPage() {
	const session = await getServerSession(authOptions)

	if (!session) {
		return (
			<div className="text-center py-12">
				<h1 className="text-2xl font-semibold text-gray-900 mb-4">Sign In Required</h1>
				<p className="text-gray-600 mb-6">Please sign in to view your settings.</p>
				<Link href="/sign-in" className="text-blue-600 hover:underline">
					Sign in
				</Link>
			</div>
		)
	}

	return <SettingsClient />
}
