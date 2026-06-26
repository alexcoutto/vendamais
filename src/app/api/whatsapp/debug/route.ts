import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function GET() {
  const ownerPhone = process.env.ZAPI_OWNER_PHONE

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('user_id, product_name, phone')
    .eq('phone', ownerPhone ?? '')
    .single()

  return NextResponse.json({
    zapi_owner_phone_env: ownerPhone ?? 'NÃO CONFIGURADO',
    profile_found: !!profile,
    profile_phone: profile?.phone ?? null,
    profile_product: profile?.product_name ?? null,
    supabase_error: error?.message ?? null,
  })
}
