import { getSupabaseAdmin } from '@/lib/supabase'
import { config } from '@/lib/config'
import { SIGNED_URL_EXPIRY_SECONDS, DEFAULT_FILE_NAME } from '@/lib/constants'
import { logger } from '@/lib/logger'
import { createHash } from 'crypto'

export interface UploadRequest {
	userId: string
	fileName: string
	contentType?: string
}

export interface UploadResponse {
	bucket: string
	storagePath: string
	signedUrl: string
	token: string
	contentType: string
}

export interface DownloadRequest {
	storagePath: string
}

export interface DownloadResponse {
	signedUrl: string
}

export class StorageService {
	private supabase = getSupabaseAdmin()
	private bucket = config.supabase.storageBucket

	async createUploadUrl(request: UploadRequest): Promise<UploadResponse> {
		const { userId, fileName, contentType = 'application/pdf' } = request

		// Create safe storage path using hash-based filename
		const fileExtension = fileName.split('.').pop() || 'pdf'
		const fileNameHash = createHash('md5').update(fileName).digest('hex').substring(0, 8)
		const safeFileName = `${fileNameHash}.${fileExtension}`
		const storagePath = `${userId}/${Date.now()}-${safeFileName}`

		// Ensure bucket exists (idempotent)
		try {
			await this.supabase.storage.createBucket(this.bucket, { public: false })
		} catch (e: any) {
			const msg = String(e?.message || e || '')
			if (!msg.toLowerCase().includes('exists')) {
				logger.error('Failed to create bucket', e, { bucket: this.bucket })
				throw new Error('Bucket unavailable')
			}
		}

		const { data, error } = await this.supabase.storage.from(this.bucket).createSignedUploadUrl(storagePath)

		if (error || !data) {
			logger.error('Failed to create signed upload URL', error, { storagePath })
			throw new Error('Failed to create signed upload URL')
		}

		return {
			bucket: this.bucket,
			storagePath,
			signedUrl: data.signedUrl,
			token: data.token,
			contentType
		}
	}

	async createDownloadUrl(request: DownloadRequest): Promise<DownloadResponse> {
		const { storagePath } = request
		const decodedPath = decodeURIComponent(storagePath)

		const { data, error } = await this.supabase.storage.from(this.bucket).createSignedUrl(decodedPath, SIGNED_URL_EXPIRY_SECONDS)

		if (error || !data) {
			logger.error('Failed to create download URL', error, { storagePath: decodedPath })
			throw new Error('Failed to create download URL')
		}

		return {
			signedUrl: data.signedUrl
		}
	}

	async downloadFile(storagePath: string): Promise<ArrayBuffer> {
		const decodedPath = decodeURIComponent(storagePath)
		const { data, error } = await this.supabase.storage.from(this.bucket).download(decodedPath)

		if (error || !data) {
			logger.error('Failed to download file', error, { storagePath: decodedPath })
			throw new Error('Failed to download file')
		}

		return data.arrayBuffer()
	}
}
