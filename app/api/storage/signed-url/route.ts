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
		if (!fileName) return NextResponse.json({ message: 'fileName required' }, { status: 400 })

		const userId = (session.user as any).id as string
		const bucket = getBucketName()
		const path = `${userId}/${Date.now()}-${fileName}`

		const supabase = getSupabaseAdmin()
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
