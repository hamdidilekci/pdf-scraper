import { createClient } from '@supabase/supabase-js'
import { config } from './config'
import { logger } from './logger'

export function getSupabaseAdmin() {
	return createClient(config.supabase.url, config.supabase.serviceRoleKey, {
		auth: { persistSession: false }
	})
}

export function getBucketName() {
	return config.supabase.storageBucket
}

export async function getSignedDownloadUrl(storagePath: string) {
	const supabase = getSupabaseAdmin()
	const bucket = getBucketName()

	const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storagePath, 3600) // 1 hour expiry

	if (error) {
		logger.error('Error creating signed URL', error, { storagePath })
		return null
	}

	return data.signedUrl
}
