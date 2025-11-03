import Stripe from 'stripe'

export type CheckoutSessionWithMetadata = Stripe.Checkout.Session & {
	metadata?: {
		userId?: string
		planType?: string
		priceId?: string
	}
}

export type InvoiceWithSubscription = Stripe.Invoice & {
	subscription?: string | Stripe.Subscription | null
	subscription_details?: {
		subscription?: string | Stripe.Subscription | null
	}
}

export type InvoiceLineWithPrice = Stripe.InvoiceLineItem & {
	price?: Stripe.Price | null
	plan?: Stripe.Plan | null
}
