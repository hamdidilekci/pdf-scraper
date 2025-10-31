import { NextRequest, NextResponse } from 'next/server'

export type RouteHandler = (req: NextRequest, context?: { params?: Record<string, string> }) => Promise<NextResponse> | NextResponse
