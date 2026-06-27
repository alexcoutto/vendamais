import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const ZAPI_BASE = `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}`
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function sbHeaders() {
  return {
    'apikey': SUPA_KEY,
    'Authorization': `Bearer ${SUPA_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  }
}

async function sbGet(path: string) {
  const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, { headers: sbHeaders() })
  return res.json()
}

async function sbPost(path: string, body: object) {
  const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    method: 'POST',
    headers: sbHeaders(),
    body: JSON.stringify(body),
  })
  return res.ok
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '').replace(/@.*$/, '')
}

function currentMonth() {
  const now = new Date()
  return `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
}

async function sendWpp(phone: string, message: string) {
  await fetch(`${ZAPI_BASE}/send-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, message }),
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  if (body.isGroupMsg) return NextResponse.json({ ok: true })
  if (!body.text?.message) return NextResponse.json({ ok: true })

  const isFromMe = body.fromMe === true || body.type === 'SentCallback'
  const phone = isFromMe
    ? process.env.ZAPI_OWNER_PHONE!
    : normalizePhone(String(body.phone))

  const text = String(body.text.message).trim()

  // Busca perfil via REST direto (contorna incompatibilidade da chave sb_secret_)
  const profiles = await sbGet(`profiles?phone=eq.${phone}&limit=1`)
  const profile = Array.isArray(profiles) ? profiles[0] : null

  if (!profile) return NextResponse.json({ ok: true })

  // Claude interpreta a mensagem
  const systemPrompt = `Você é um assistente do VendaMais que registra vendas via WhatsApp.

Perfil do usuário:
- Produto: ${profile.product_name}
- Custo padrão: ${profile.cost_price}
- Preço de venda padrão: ${profile.selling_price}

Interprete a mensagem e retorne SOMENTE JSON (sem texto extra):

Registro de venda:
{"action":"sale","quantity":1,"delivery_type":"proprio","freight_cost":0,"cost_price":${profile.cost_price},"selling_price":${profile.selling_price}}

Consulta de resumo:
{"action":"summary"}

Não reconhecido:
{"action":"unknown","reply":"resposta em português"}

Regras:
- Se não mencionar entrega → delivery_type "proprio", freight_cost 0
- Se disser "transportadora" sem valor → action "unknown" pedindo o valor do frete
- quantity pode ser > 1 se o usuário disser "2 vendas", "vendi 3", etc.`

  let parsed: { action: string; quantity?: number; delivery_type?: string; freight_cost?: number; cost_price?: number; selling_price?: number; reply?: string } | null = null

  try {
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 256,
      system: systemPrompt,
      messages: [{ role: 'user', content: text }],
    })
    const raw = resp.content[0].type === 'text' ? resp.content[0].text.trim() : ''
    parsed = JSON.parse(raw)
  } catch {
    await sendWpp(phone, '⚠️ Não entendi. Tente:\n"vendi 1 kit hoje"\n"resumo do mês"')
    return NextResponse.json({ ok: true })
  }

  if (!parsed) return NextResponse.json({ ok: true })

  if (parsed.action === 'unknown') {
    await sendWpp(phone, parsed.reply ?? 'Não entendi. Tente "vendi 1 kit" ou "resumo".')
    return NextResponse.json({ ok: true })
  }

  if (parsed.action === 'summary') {
    const month = currentMonth()
    const [sales, costs] = await Promise.all([
      sbGet(`sales?user_id=eq.${profile.user_id}&month=eq.${month}&select=profit`),
      sbGet(`monthly_costs?user_id=eq.${profile.user_id}&month=eq.${month}&select=total_costs&limit=1`),
    ])

    const grossProfit = (Array.isArray(sales) ? sales : []).reduce((s: number, r: { profit: string }) => s + Number(r.profit), 0)
    const totalCosts = Number(Array.isArray(costs) && costs[0]?.total_costs || 0)
    const net = grossProfit - totalCosts
    const goalPct = profile.monthly_goal > 0 ? Math.round((net / profile.monthly_goal) * 100) : 0
    const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

    await sendWpp(phone,
      `📊 *Resumo de ${month}*\n\n` +
      `🛒 Vendas: ${(Array.isArray(sales) ? sales : []).length}\n` +
      `💵 Lucro bruto: ${fmt(grossProfit)}\n` +
      `📦 Custos mensais: ${fmt(totalCosts)}\n` +
      `✅ Lucro líquido: ${fmt(net)}\n` +
      `🎯 Meta: ${goalPct}% atingida\n\n` +
      (goalPct >= 100 ? '🏆 Meta batida! Parabéns!' : `Faltam ${fmt(profile.monthly_goal - net)} para a meta`)
    )
    return NextResponse.json({ ok: true })
  }

  if (parsed.action === 'sale') {
    const qty = Math.max(1, Number(parsed.quantity) || 1)
    const costPrice = Number(parsed.cost_price) || Number(profile.cost_price)
    const sellingPrice = Number(parsed.selling_price) || Number(profile.selling_price)
    const freightCost = Number(parsed.freight_cost) || 0
    const today = new Date().toISOString().split('T')[0]

    const rows = Array.from({ length: qty }, () => ({
      user_id: profile.user_id,
      date: today,
      delivery_type: parsed!.delivery_type || 'proprio',
      freight_cost: freightCost,
      cost_price: costPrice,
      selling_price: sellingPrice,
    }))

    const ok = await sbPost('sales', rows.length === 1 ? rows[0] : rows)

    if (!ok) {
      await sendWpp(phone, '❌ Erro ao salvar. Tente de novo ou acesse o app.')
      return NextResponse.json({ ok: true })
    }

    const lucroUnit = sellingPrice - costPrice - freightCost
    const lucroTotal = lucroUnit * qty
    const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

    await sendWpp(phone,
      qty > 1
        ? `✅ *${qty} vendas registradas!*\n\n💰 Lucro por venda: ${fmt(lucroUnit)}\n💵 Lucro total: ${fmt(lucroTotal)}\n\nDigite *resumo* para ver o mês.`
        : `✅ *Venda registrada!*\n\n💰 Lucro: ${fmt(lucroUnit)}\n\nDigite *resumo* para ver o mês.`
    )
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ ok: true })
}
