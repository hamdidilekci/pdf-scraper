'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { signIn } from 'next-auth/react'

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
		<form onSubmit={handleSubmit(onSubmit)} className="mx-auto w-full max-w-sm space-y-4">
			<div>
				<label className="mb-1 block text-sm">Email</label>
				<input type="email" className="w-full rounded border px-3 py-2" placeholder="you@example.com" {...register('email')} />
				{errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
			</div>
			<div>
				<label className="mb-1 block text-sm">Password</label>
				<input type="password" className="w-full rounded border px-3 py-2" placeholder="••••••••" {...register('password')} />
				{errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
			</div>
			{error && <p className="text-sm text-red-600">{error}</p>}
			<button type="submit" disabled={loading} className="w-full rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-50">
				{loading ? (mode === 'sign-up' ? 'Creating account...' : 'Signing in...') : mode === 'sign-up' ? 'Create account' : 'Sign in'}
			</button>
		</form>
	)
}
