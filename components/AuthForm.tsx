'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { signIn } from 'next-auth/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

const schema = z.object({
	email: z.string().email(),
	password: z.string().min(8, 'Password must be at least 8 characters')
})

type FormValues = z.infer<typeof schema>

export default function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
	const router = useRouter()
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)

	const {
		register,
		handleSubmit,
		watch,
		formState: { errors }
	} = useForm<FormValues>({ resolver: zodResolver(schema) })

	// Watch email field to clear errors when user starts typing
	const emailValue = watch('email')
	const passwordValue = watch('password')

	// Clear error when user starts typing
	React.useEffect(() => {
		if (error && (emailValue || passwordValue)) {
			setError(null)
		}
	}, [emailValue, passwordValue, error])

	const onSubmit = async (values: FormValues) => {
		setError(null)
		setLoading(true)
		try {
			if (mode === 'sign-up') {
				const res = await fetch('/api/auth/register', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(values)
				})
				const body = await res.json().catch(() => ({}))
				if (!res.ok) {
					const errorMessage = body?.error?.message || 'We could not create your account. Please try again'
					toast.error(errorMessage)
					throw new Error(errorMessage)
				}

				// Auto sign in after successful registration
				toast.success('Account created successfully! Redirecting...')
				const signInRes = await signIn('credentials', {
					email: values.email,
					password: values.password,
					redirect: false
				})

				if (!signInRes || signInRes.error) {
					// If auto sign-in fails, redirect to sign-in page
					router.push('/sign-in')
					return
				}

				toast.success('Signed in successfully!')
				router.replace('/')
				return
			}

			const res = await signIn('credentials', {
				email: values.email,
				password: values.password,
				redirect: false
			})
			if (!res || res.error) {
				const errorMsg =
					res?.error === 'CredentialsSignin'
						? 'Invalid email or password. Please check your credentials and try again'
						: res?.error || 'We could not sign you in. Please try again'
				toast.error(errorMsg)
				throw new Error(errorMsg)
			}
			toast.success('Welcome back! Redirecting to your dashboard...')
			router.replace('/')
		} catch (err: any) {
			const errorMessage = err.message || 'An unexpected error occurred. Please try again'
			setError(errorMessage)
		} finally {
			setLoading(false)
		}
	}

	return (
		<Card className="mx-auto w-full max-w-sm">
			<CardContent className="pt-6">
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
					<div>
						<Label htmlFor="email">Email</Label>
						<Input id="email" type="email" placeholder="you@example.com" {...register('email')} />
						{errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
					</div>
					<div>
						<Label htmlFor="password">Password</Label>
						<Input id="password" type="password" placeholder="••••••••" {...register('password')} />
						{errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
					</div>
					{error && <p className="text-sm text-red-600">{error}</p>}
					<Button type="submit" disabled={loading} className="w-full">
						{loading && (
							<svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
								<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
								<path
									className="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
						)}
						{loading ? (mode === 'sign-up' ? 'Creating account...' : 'Signing in...') : mode === 'sign-up' ? 'Create account' : 'Sign in'}
					</Button>
				</form>
			</CardContent>
		</Card>
	)
}
