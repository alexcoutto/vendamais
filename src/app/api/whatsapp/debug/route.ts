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

  // Busca todos os perfis para diagnóstico
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('user_id, product_name, phone')
    .limit(5)

  return NextResponse.json({
    zapi_owner_phone_env: ownerPhone ?? 'NÃO CONFIGURADO',
    profile_found: !!profile,
    profile_phone: profile?.phone ?? null,
    supabase_error: error?.message ?? null,
    all_profiles: allProfiles ?? [],
  })
}
