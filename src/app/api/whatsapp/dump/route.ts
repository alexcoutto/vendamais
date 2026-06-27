import { NextRequest, NextResponse } from 'next/server'

let lastBody: unknown = null

export async function POST(req: NextRequest) {
  lastBody = await req.json()
  console.log('ZAPI DUMP:', JSON.stringify(lastBody, null, 2))
  return NextResponse.json({ ok: true })
}

export async function GET() {
  return NextResponse.json({ lastBody })
}
