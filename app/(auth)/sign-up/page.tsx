import Link from 'next/link'
import AuthForm from '@/components/AuthForm'

export default function SignUpPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Create your account</h1>
				<p className="text-sm text-gray-600">
					Already have an account?{' '}
					<Link href="/sign-in" className="text-blue-600 hover:underline">
						Sign in
					</Link>
				</p>
			</div>
			<AuthForm mode="sign-up" />
		</div>
	)
}
