import { NextRequest, NextResponse } from 'next/server'
import { MercadoPagoConfig, Preference } from 'mercadopago'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
  })

  const preference = new Preference(client)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  const result = await preference.create({
    body: {
      items: [{
        id: 'vendamais-mensal',
        title: 'VendaMais — Plano Mensal',
        quantity: 1,
        unit_price: 29,
        currency_id: 'BRL',
      }],
      payer: { email: user.email },
      back_urls: {
        success: `${appUrl}/configuracoes?status=success`,
        failure: `${appUrl}/configuracoes?status=failure`,
        pending: `${appUrl}/configuracoes?status=pending`,
      },
      auto_return: 'approved',
      external_reference: user.id,
      notification_url: `${appUrl}/api/webhook`,
    },
  })

  return NextResponse.json({ url: result.init_point })
}
