import Link from 'next/link'
import AuthForm from '@/components/AuthForm'

export default function SignInPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Sign in</h1>
				<p className="text-sm text-gray-600">
					Don&apos;t have an account?{' '}
					<Link href="/sign-up" className="text-blue-600 hover:underline">
						Sign up
					</Link>
				</p>
			</div>
			<AuthForm mode="sign-in" />
		</div>
	)
}
