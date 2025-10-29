import { createClient } from '@supabase/supabase-js'

export function getSupabaseAdmin() {
	const url = process.env.SUPABASE_URL
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY
	if (!url || !key) throw new Error('Supabase admin env vars missing')
	return createClient(url, key, { auth: { persistSession: false } })
}

export function getBucketName() {
	return process.env.SUPABASE_STORAGE_BUCKET || 'pdfs'
}
