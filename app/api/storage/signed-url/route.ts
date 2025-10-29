import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSupabaseAdmin, getBucketName } from '@/lib/supabase'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
	const session = await getServerSession(authOptions)
	if (!session?.user?.email || !(session.user as any).id) {
		return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
	}

	try {
		const body = await request.json()
		const fileName: string = body?.fileName
		const contentType: string = body?.contentType || 'application/pdf'
		const action: string = body?.action || 'upload'
		const storagePath: string = body?.storagePath

		if (!fileName) return NextResponse.json({ message: 'fileName required' }, { status: 400 })

		const userId = (session.user as any).id as string
		const bucket = getBucketName()
		const supabase = getSupabaseAdmin()

		// Handle download requests
		if (action === 'download' && storagePath) {
			// Decode the storage path to handle URL-encoded characters
			const decodedStoragePath = decodeURIComponent(storagePath)
			const { data, error } = await supabase.storage.from(bucket).createSignedUrl(decodedStoragePath, 3600) // 1 hour expiry

			if (error || !data) {
				console.error('Download signed URL error:', error)
				console.error('Storage path that failed:', decodedStoragePath)
				return NextResponse.json({ message: 'Failed to create download URL' }, { status: 500 })
			}

			return NextResponse.json({
				signedUrl: data.signedUrl
			})
		}

		// Handle upload requests (existing logic)
		// Create a safe storage path using a hash-based filename to avoid special character issues
		const crypto = require('crypto')
		const fileExtension = fileName.split('.').pop() || 'pdf'
		const fileNameHash = crypto.createHash('md5').update(fileName).digest('hex').substring(0, 8)
		const safeFileName = `${fileNameHash}.${fileExtension}`
		const path = `${userId}/${Date.now()}-${safeFileName}`

		// Store the original filename mapping in the database for later retrieval
		// We'll create a temporary record that will be updated during extraction
		try {
			await (prisma as any).resume.create({
				data: {
					userId,
					fileName: fileName, // Store original filename
					storagePath: path,
					status: 'PENDING'
				}
			})
		} catch (dbError) {
			console.error('Failed to create resume record:', dbError)
			// Continue with upload even if DB fails
		}

		// Ensure bucket exists (idempotent)
		try {
			await supabase.storage.createBucket(bucket, { public: false })
		} catch (e: any) {
			const msg = String(e?.message || e || '')
			if (!msg.toLowerCase().includes('exists')) {
				console.error('Bucket create error:', e)
				return NextResponse.json({ message: 'Bucket unavailable' }, { status: 500 })
			}
		}

		const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path)
		if (error || !data) {
			console.error('Signed URL error:', error)
			return NextResponse.json({ message: 'Failed to create signed upload' }, { status: 500 })
		}

		return NextResponse.json({
			bucket,
			storagePath: path,
			signedUrl: data.signedUrl,
			token: data.token,
			contentType
		})
	} catch (err) {
		console.error('signed-url handler error:', err)
		return NextResponse.json({ message: 'Server error' }, { status: 500 })
	}
}
