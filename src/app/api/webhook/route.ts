import { NextRequest, NextResponse } from 'next/server'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const body = await req.json()

  if (body.type !== 'payment') {
    return NextResponse.json({ received: true })
  }

  const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
  })

  const payment = new Payment(client)
  const data = await payment.get({ id: body.data.id })

  if (data.status !== 'approved') {
    return NextResponse.json({ received: true })
  }

  const userId = data.external_reference
  if (!userId) return NextResponse.json({ received: true })

  const endDate = new Date()
  endDate.setMonth(endDate.getMonth() + 1)

  await supabase
    .from('profiles')
    .update({
      subscription_status: 'active',
      subscription_end_date: endDate.toISOString(),
    })
    .eq('user_id', userId)

  return NextResponse.json({ received: true })
}
