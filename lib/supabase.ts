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

export async function getSignedDownloadUrl(storagePath: string) {
	const supabase = getSupabaseAdmin()
	const bucket = getBucketName()

	const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storagePath, 3600) // 1 hour expiry

	if (error) {
		console.error('Error creating signed URL:', error)
		return null
	}

	return data.signedUrl
}
