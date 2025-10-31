'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PLAN_TYPES, PLAN_CREDITS, CREDITS_PER_RESUME } from '@/lib/constants'

interface UserSettings {
	credits: number
	planType: 'BASIC' | 'PRO' | null
	hasStripeCustomer: boolean
	hasSubscription: boolean
}

export default function SettingsClient() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const [data, setData] = useState<UserSettings | null>(null)
	const [loading, setLoading] = useState(true)
	const [processing, setProcessing] = useState<string | null>(null)
	// Stripe configuration - assume configured, will show error messages if not
	const [isStripeConfigured, setIsStripeConfigured] = useState(true)

	// Check for success/cancel query params from Stripe redirects
	useEffect(() => {
		const success = searchParams.get('success')
		const canceled = searchParams.get('canceled')

		if (success === 'true') {
			toast.success('Subscription activated successfully! Your credits have been added.')
			// Remove query param
			router.replace('/settings')
		} else if (canceled === 'true') {
			toast.info('Subscription canceled. No charges were made.')
			router.replace('/settings')
		}
	}, [searchParams, router])

	useEffect(() => {
		const fetchSettings = async () => {
			try {
				const response = await fetch('/api/user')
				const result = await response.json().catch(() => ({}))

				if (response.ok && result.success && result.data) {
					setData(result.data)
				} else {
					const errorMsg = result?.error?.message || 'We could not load your settings. Please refresh the page'
					toast.error(errorMsg)
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'We could not load your settings. Please refresh the page'
				toast.error(errorMessage)
			} finally {
				setLoading(false)
			}
		}

		fetchSettings()
	}, [])

	const handleCheckout = async (planType: 'BASIC' | 'PRO') => {
		if (!isStripeConfigured) {
			toast.error('Payment service is not configured. Please contact support.')
			return
		}

		try {
			setProcessing(planType)

			const response = await fetch('/api/stripe/checkout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ planType })
			})

			const result = await response.json().catch(() => ({}))

			if (response.ok && result.success && result.data?.url) {
				// Redirect to Stripe Checkout
				window.location.href = result.data.url
			} else {
				const errorMsg = result?.error?.message || 'We could not create the checkout session. Please try again'
				toast.error(errorMsg)
				setProcessing(null)
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'We could not process your request. Please try again'
			toast.error(errorMessage)
			setProcessing(null)
		}
	}

	const handlePortal = async () => {
		if (!isStripeConfigured) {
			toast.error('Payment service is not configured. Please contact support.')
			return
		}

		try {
			setProcessing('portal')

			const response = await fetch('/api/stripe/portal', {
				method: 'POST'
			})

			const result = await response.json().catch(() => ({}))

			if (response.ok && result.success && result.data?.url) {
				// Redirect to Stripe Customer Portal
				window.location.href = result.data.url
			} else {
				const errorMsg = result?.error?.message || 'We could not create the billing portal session. Please try again'
				toast.error(errorMsg)
				setProcessing(null)
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'We could not process your request. Please try again'
			toast.error(errorMessage)
			setProcessing(null)
		}
	}

	const getPlanBadgeClass = (planType: string | null) => {
		switch (planType) {
			case PLAN_TYPES.BASIC:
				return 'bg-blue-100 text-blue-800'
			case PLAN_TYPES.PRO:
				return 'bg-purple-100 text-purple-800'
			default:
				return 'bg-gray-100 text-gray-800'
		}
	}

	const getPlanName = (planType: string | null) => {
		switch (planType) {
			case PLAN_TYPES.BASIC:
				return 'Basic Plan'
			case PLAN_TYPES.PRO:
				return 'Pro Plan'
			default:
				return 'No Plan'
		}
	}

	if (loading) {
		return (
			<div className="space-y-6">
				<h1 className="text-2xl font-semibold">Settings</h1>
				<div className="rounded-lg border bg-white p-6 space-y-4">
					<Skeleton className="h-8 w-32" />
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-10 w-48" />
				</div>
			</div>
		)
	}

	if (!data) {
		return (
			<div className="text-center py-12">
				<h1 className="text-2xl font-semibold text-gray-900 mb-4">Unable to Load Settings</h1>
				<p className="text-gray-600 mb-6">We encountered an issue loading your settings. Please try refreshing the page.</p>
				<Button onClick={() => window.location.reload()}>Refresh Page</Button>
			</div>
		)
	}

	const canUpgrade = data.planType !== PLAN_TYPES.PRO
	const showBasicButton = data.planType === null
	const showUpgradeButton = data.planType === PLAN_TYPES.BASIC

	return (
		<div className="space-y-6">
			<h1 className="text-2xl font-semibold">Settings</h1>

			{/* Subscription Section */}
			<div className="rounded-lg border bg-white p-6 space-y-4">
				<h2 className="text-lg font-semibold">Subscription</h2>

				{/* Current Plan */}
				<div className="flex items-center justify-between py-3 border-b">
					<div>
						<p className="text-sm text-gray-600">Current Plan</p>
						<p className="text-lg font-medium mt-1">{getPlanName(data.planType)}</p>
					</div>
					<span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${getPlanBadgeClass(data.planType)}`}>
						{data.planType || 'Free'}
					</span>
				</div>

				{/* Credit Balance */}
				<div className="flex items-center justify-between py-3 border-b">
					<div>
						<p className="text-sm text-gray-600">Credit Balance</p>
						<p className="text-3xl font-bold mt-1 text-gray-900">{data.credits.toLocaleString()}</p>
						<p className="text-xs text-gray-500 mt-1">
							Each resume extraction costs {CREDITS_PER_RESUME} credits. You can process approximately {Math.floor(data.credits / CREDITS_PER_RESUME)}{' '}
							resumes with your current balance.
						</p>
					</div>
				</div>

				{/* Plan Details */}
				<div className="bg-gray-50 rounded-lg p-4 space-y-3">
					<h3 className="font-medium text-sm">Plan Details</h3>
					<div className="space-y-2 text-sm">
						<div className="flex justify-between">
							<span className="text-gray-600">Basic Plan</span>
							<span className="font-medium">{PLAN_CREDITS.BASIC.toLocaleString()} credits</span>
						</div>
						<div className="flex justify-between">
							<span className="text-gray-600">Pro Plan</span>
							<span className="font-medium">{PLAN_CREDITS.PRO.toLocaleString()} credits</span>
						</div>
					</div>
				</div>

				{/* Action Buttons */}
				{isStripeConfigured ? (
					<div className="space-y-3 pt-4">
						{showBasicButton && (
							<Button onClick={() => handleCheckout(PLAN_TYPES.BASIC)} disabled={!!processing} className="w-full" variant="default">
								{processing === PLAN_TYPES.BASIC ? (
									<>
										<svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
											<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
											<path
												className="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
											></path>
										</svg>
										Processing...
									</>
								) : (
									'Subscribe to Basic Plan'
								)}
							</Button>
						)}

						{showUpgradeButton && (
							<Button onClick={() => handleCheckout(PLAN_TYPES.PRO)} disabled={!!processing} className="w-full" variant="default">
								{processing === PLAN_TYPES.PRO ? (
									<>
										<svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
											<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
											<path
												className="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
											></path>
										</svg>
										Processing...
									</>
								) : (
									'Upgrade to Pro Plan'
								)}
							</Button>
						)}

						{data.hasSubscription && (
							<Button onClick={handlePortal} disabled={!!processing} className="w-full" variant="outline">
								{processing === 'portal' ? (
									<>
										<svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
											<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
											<path
												className="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
											></path>
										</svg>
										Loading...
									</>
								) : (
									'Manage Billing'
								)}
							</Button>
						)}
					</div>
				) : (
					<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
						<p className="text-sm text-yellow-800">Payment features are not currently available. Please contact support for subscription options.</p>
					</div>
				)}
			</div>
		</div>
	)
}
