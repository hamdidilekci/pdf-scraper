'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { OTP } from '@/lib/constants'

type Step = 'email' | 'otp' | 'password'

const emailSchema = z.object({
	email: z.string().email('Please enter a valid email address')
})

const otpSchema = z.object({
	otp: z.string().length(OTP.LENGTH, `Verification code must be ${OTP.LENGTH} digits`).regex(/^\d+$/, 'Verification code must contain only numbers')
})

const passwordSchema = z
	.object({
		password: z.string().min(8, 'Password must be at least 8 characters'),
		confirmPassword: z.string().min(8, 'Please confirm your password')
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: 'Passwords do not match',
		path: ['confirmPassword']
	})

type EmailValues = z.infer<typeof emailSchema>
type OTPValues = z.infer<typeof otpSchema>
type PasswordValues = z.infer<typeof passwordSchema>

export default function ForgotPasswordForm() {
	const router = useRouter()
	const [step, setStep] = useState<Step>('email')
	const [email, setEmail] = useState('')
	const [countdown, setCountdown] = useState(0)
	const [loading, setLoading] = useState(false)

	const emailForm = useForm<EmailValues>({ resolver: zodResolver(emailSchema) })
	const otpForm = useForm<OTPValues>({ resolver: zodResolver(otpSchema) })
	const passwordForm = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) })

	// Countdown timer
	useEffect(() => {
		if (step === 'otp' && countdown > 0) {
			const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
			return () => clearTimeout(timer)
		}
	}, [countdown, step])

	const onEmailSubmit = async (values: EmailValues) => {
		setLoading(true)
		try {
			const res = await fetch('/api/auth/forgot-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: values.email })
			})

			const result = await res.json().catch(() => ({}))
			if (!res.ok) {
				const errorMessage = result?.error?.message || 'We could not send the verification code. Please try again'
				toast.error(errorMessage)
				return
			}

			setEmail(values.email.toLowerCase())
			setStep('otp')
			setCountdown(OTP.EXPIRY_MINUTES * 60)
			toast.success('Verification code sent to your email')
		} catch (error) {
			toast.error('An unexpected error occurred. Please try again')
		} finally {
			setLoading(false)
		}
	}

	const onOTPSubmit = async (values: OTPValues) => {
		setLoading(true)
		try {
			const res = await fetch('/api/auth/verify-otp', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, otp: values.otp })
			})

			const result = await res.json().catch(() => ({}))
			if (!res.ok) {
				const errorMessage = result?.error?.message || 'Invalid verification code. Please try again'
				toast.error(errorMessage)
				return
			}

			setStep('password')
			toast.success('Verification code verified')
		} catch (error) {
			toast.error('An unexpected error occurred. Please try again')
		} finally {
			setLoading(false)
		}
	}

	const onPasswordSubmit = async (values: PasswordValues) => {
		setLoading(true)
		try {
			// Get OTP from form (stored in state if needed, or re-verify)
			const otpValue = otpForm.getValues('otp')

			const res = await fetch('/api/auth/reset-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email,
					otp: otpValue,
					password: values.password
				})
			})

			const result = await res.json().catch(() => ({}))
			if (!res.ok) {
				const errorMessage = result?.error?.message || 'We could not reset your password. Please try again'
				toast.error(errorMessage)
				return
			}

			toast.success('Password reset successfully! Redirecting to sign in...')
			setTimeout(() => {
				router.push('/sign-in')
			}, 1500)
		} catch (error) {
			toast.error('An unexpected error occurred. Please try again')
		} finally {
			setLoading(false)
		}
	}

	const resendOTP = async () => {
		setLoading(true)
		try {
			const res = await fetch('/api/auth/forgot-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email })
			})

			const result = await res.json().catch(() => ({}))
			if (!res.ok) {
				const errorMessage = result?.error?.message || 'We could not resend the code. Please try again'
				toast.error(errorMessage)
				return
			}

			setCountdown(OTP.EXPIRY_MINUTES * 60)
			otpForm.reset()
			toast.success('Verification code resent')
		} catch (error) {
			toast.error('An unexpected error occurred. Please try again')
		} finally {
			setLoading(false)
		}
	}

	const formatTime = (seconds: number): string => {
		const mins = Math.floor(seconds / 60)
		const secs = seconds % 60
		return `${mins}:${secs.toString().padStart(2, '0')}`
	}

	return (
		<Card className="mx-auto w-full max-w-sm">
			<CardContent className="pt-6">
				<div className="mb-6">
					<h1 className="text-2xl font-semibold text-gray-900 mb-2">Reset Password</h1>
					<p className="text-sm text-gray-600">
						{step === 'email' && 'Enter your email address to receive a verification code'}
						{step === 'otp' && 'Enter the verification code sent to your email'}
						{step === 'password' && 'Enter your new password'}
					</p>
				</div>

				{step === 'email' && (
					<form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
						<div>
							<Label htmlFor="email">Email</Label>
							<Input id="email" type="email" placeholder="you@example.com" {...emailForm.register('email')} />
							{emailForm.formState.errors.email && <p className="mt-1 text-sm text-red-600">{emailForm.formState.errors.email.message}</p>}
						</div>
						<Button type="submit" disabled={loading} className="w-full">
							{loading ? 'Sending...' : 'Send Verification Code'}
						</Button>
						<div className="text-center">
							<Link href="/sign-in" className="text-sm text-blue-600 hover:underline">
								Back to sign in
							</Link>
						</div>
					</form>
				)}

				{step === 'otp' && (
					<form onSubmit={otpForm.handleSubmit(onOTPSubmit)} className="space-y-4">
						<div>
							<Label htmlFor="otp">Verification Code</Label>
							<Input
								id="otp"
								type="text"
								placeholder={`${OTP.LENGTH}-digit code`}
								maxLength={OTP.LENGTH}
								{...otpForm.register('otp')}
								onChange={(e) => {
									const value = e.target.value.replace(/\D/g, '').slice(0, OTP.LENGTH)
									otpForm.setValue('otp', value, { shouldValidate: true })
								}}
							/>
							{otpForm.formState.errors.otp && <p className="mt-1 text-sm text-red-600">{otpForm.formState.errors.otp.message}</p>}
							{countdown > 0 && (
								<p className="mt-1 text-sm text-gray-600">
									Code expires in: <span className="font-medium">{formatTime(countdown)}</span>
								</p>
							)}
							{countdown === 0 && <p className="mt-1 text-sm text-orange-600">Verification code has expired</p>}
						</div>
						<Button type="submit" disabled={loading || countdown === 0} className="w-full">
							{loading ? 'Verifying...' : 'Verify Code'}
						</Button>
						<div className="flex items-center justify-between text-sm">
							<button type="button" onClick={() => setStep('email')} className="text-blue-600 hover:underline">
								Change email
							</button>
							{countdown === 0 && (
								<button type="button" onClick={resendOTP} disabled={loading} className="text-blue-600 hover:underline disabled:text-gray-400">
									Resend code
								</button>
							)}
						</div>
					</form>
				)}

				{step === 'password' && (
					<form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
						<div>
							<Label htmlFor="password">New Password</Label>
							<Input id="password" type="password" placeholder="••••••••" {...passwordForm.register('password')} />
							{passwordForm.formState.errors.password && (
								<p className="mt-1 text-sm text-red-600">{passwordForm.formState.errors.password.message}</p>
							)}
						</div>
						<div>
							<Label htmlFor="confirmPassword">Confirm Password</Label>
							<Input id="confirmPassword" type="password" placeholder="••••••••" {...passwordForm.register('confirmPassword')} />
							{passwordForm.formState.errors.confirmPassword && (
								<p className="mt-1 text-sm text-red-600">{passwordForm.formState.errors.confirmPassword.message}</p>
							)}
						</div>
						<Button type="submit" disabled={loading} className="w-full">
							{loading ? 'Resetting...' : 'Reset Password'}
						</Button>
						<div className="text-center">
							<button type="button" onClick={() => setStep('otp')} className="text-sm text-blue-600 hover:underline">
								Back to verification
							</button>
						</div>
					</form>
				)}
			</CardContent>
		</Card>
	)
}
