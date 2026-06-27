import { NextResponse } from 'next/server'

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET() {
  const ownerPhone = process.env.ZAPI_OWNER_PHONE

  const headers = {
    'apikey': SUPA_KEY,
    'Authorization': `Bearer ${SUPA_KEY}`,
  }

  const [byPhone, allProfiles] = await Promise.all([
    fetch(`${SUPA_URL}/rest/v1/profiles?phone=eq.${ownerPhone}&limit=1`, { headers }).then(r => r.json()),
    fetch(`${SUPA_URL}/rest/v1/profiles?select=user_id,product_name,phone&limit=5`, { headers }).then(r => r.json()),
  ])

  const profile = Array.isArray(byPhone) ? byPhone[0] : null

  return NextResponse.json({
    zapi_owner_phone_env: ownerPhone ?? 'NÃO CONFIGURADO',
    profile_found: !!profile,
    profile_phone: profile?.phone ?? null,
    profile_product: profile?.product_name ?? null,
    all_profiles: Array.isArray(allProfiles) ? allProfiles : allProfiles,
  })
}
