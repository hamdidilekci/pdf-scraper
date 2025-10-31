'use client'

import { createClient } from '@supabase/supabase-js'

// Client-side only - cannot use config.ts which validates at module level
export function getSupabaseClient() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL
	const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
	if (!url || !anon) throw new Error('Supabase client env vars missing')
	return createClient(url, anon, { auth: { persistSession: false } })
}
