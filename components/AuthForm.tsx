'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { signIn } from 'next-auth/react'
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
		formState: { errors }
	} = useForm<FormValues>({ resolver: zodResolver(schema) })

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
				if (!res.ok) {
					const body = await res.json().catch(() => ({}))
					throw new Error(body?.message || 'Registration failed')
				}
				router.push('/sign-in')
				return
			}

			const res = await signIn('credentials', {
				email: values.email,
				password: values.password,
				redirect: false
			})
			if (!res || res.error) {
				throw new Error(res?.error || 'Invalid credentials')
			}
			router.replace('/')
		} catch (err: any) {
			setError(err.message || 'Something went wrong')
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
						{loading ? (mode === 'sign-up' ? 'Creating account...' : 'Signing in...') : mode === 'sign-up' ? 'Create account' : 'Sign in'}
					</Button>
				</form>
			</CardContent>
		</Card>
	)
}
