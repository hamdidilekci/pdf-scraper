import { z } from 'zod'
import { DEFAULT_STORAGE_BUCKET } from './constants'

// Environment variable validation schema
const envSchema = z.object({
	// Database
	DATABASE_URL: z.string().url(),
	DIRECT_URL: z.string().url().optional(),

	// Supabase
	SUPABASE_URL: z.string().url(),
	SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
	NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
	NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
	SUPABASE_STORAGE_BUCKET: z.string().optional(),

	// OpenAI
	OPENAI_API_KEY: z.string().min(1),

	// NextAuth
	NEXTAUTH_SECRET: z.string().min(1),
	NEXTAUTH_URL: z.string().url(),

	// Email Service (optional - only needed for forgot password)
	RESEND_API_KEY: z.string().min(1).optional(),
	FROM_EMAIL: z.string().email().optional(),
	APP_NAME: z.string().optional(),

	// Stripe (optional - only needed for payment integration)
	STRIPE_SECRET_KEY: z.string().min(1).optional(),
	STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
	STRIPE_PRICE_BASIC: z.string().optional(),
	STRIPE_PRICE_PRO: z.string().optional(),
	NEXT_PUBLIC_STRIPE_PUBLIC_KEY: z.string().min(1).optional(),

	// Node Environment
	NODE_ENV: z.enum(['development', 'production', 'test']).optional().default('development')
})

type Env = z.infer<typeof envSchema>

// Validate environment variables
function validateEnv(): Env {
	try {
		return envSchema.parse({
			DATABASE_URL: process.env.DATABASE_URL,
			DIRECT_URL: process.env.DIRECT_URL,
			SUPABASE_URL: process.env.SUPABASE_URL,
			SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
			NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
			NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
			SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET,
			OPENAI_API_KEY: process.env.OPENAI_API_KEY,
			NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
			NEXTAUTH_URL: process.env.NEXTAUTH_URL,
			RESEND_API_KEY: process.env.RESEND_API_KEY,
			FROM_EMAIL: process.env.FROM_EMAIL,
			APP_NAME: process.env.APP_NAME,
			STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
			STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
			STRIPE_PRICE_BASIC: process.env.STRIPE_PRICE_BASIC,
			STRIPE_PRICE_PRO: process.env.STRIPE_PRICE_PRO,
			NEXT_PUBLIC_STRIPE_PUBLIC_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY,
			NODE_ENV: process.env.NODE_ENV
		})
	} catch (error) {
		if (error instanceof z.ZodError) {
			const missingVars = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('\n')
			throw new Error(`Environment validation failed:\n${missingVars}`)
		}
		throw error
	}
}

const env = validateEnv()

// Typed configuration object
export const config = {
	database: {
		url: env.DATABASE_URL,
		directUrl: env.DIRECT_URL
	},
	supabase: {
		url: env.SUPABASE_URL,
		serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
		publicUrl: env.NEXT_PUBLIC_SUPABASE_URL,
		anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
		storageBucket: env.SUPABASE_STORAGE_BUCKET || DEFAULT_STORAGE_BUCKET
	},
	openai: {
		apiKey: env.OPENAI_API_KEY
	},
	nextAuth: {
		secret: env.NEXTAUTH_SECRET,
		url: env.NEXTAUTH_URL
	},
	email: {
		resendApiKey: env.RESEND_API_KEY || '',
		fromEmail: env.FROM_EMAIL || '',
		appName: env.APP_NAME || 'PDF Scraper App'
	},
	stripe: {
		secretKey: env.STRIPE_SECRET_KEY || '',
		webhookSecret: env.STRIPE_WEBHOOK_SECRET || '',
		priceBasic: env.STRIPE_PRICE_BASIC || '',
		pricePro: env.STRIPE_PRICE_PRO || '',
		publicKey: env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || ''
	},
	nodeEnv: env.NODE_ENV
} as const

// Type export for use in other files
export type Config = typeof config
