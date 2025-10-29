import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSupabaseAdmin, getBucketName } from '@/lib/supabase'

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
			const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storagePath, 3600) // 1 hour expiry

			if (error || !data) {
				console.error('Download signed URL error:', error)
				return NextResponse.json({ message: 'Failed to create download URL' }, { status: 500 })
			}

			return NextResponse.json({
				signedUrl: data.signedUrl
			})
		}

		// Handle upload requests (existing logic)
		const path = `${userId}/${Date.now()}-${fileName}`

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
