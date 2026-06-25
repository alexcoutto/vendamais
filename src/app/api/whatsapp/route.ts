import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const ZAPI_BASE = `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}`

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function adminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '').replace(/@.*$/, '')
}

function currentMonth() {
  const now = new Date()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${m}/${now.getFullYear()}`
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

  // Só processa mensagens de texto recebidas (não grupos, não status)
  if (body.type !== 'ReceivedCallback') return NextResponse.json({ ok: true })
  if (body.isGroupMsg) return NextResponse.json({ ok: true })
  if (!body.text?.message) return NextResponse.json({ ok: true })

  const phone = normalizePhone(String(body.phone))
  const text = String(body.text.message).trim()
  const supabase = adminClient()

  // Busca perfil pelo telefone
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('phone', phone)
    .single()

  if (!profile) {
    return NextResponse.json({ ok: true })
  }

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
    await sendWpp(phone, '⚠️ Não entendi. Tente:\n"vendi 1 kit hoje"\n"vendi 2, transportadora 150"\n"resumo do mês"')
    return NextResponse.json({ ok: true })
  }

  if (!parsed) return NextResponse.json({ ok: true })

  // ── Resposta desconhecida ──
  if (parsed.action === 'unknown') {
    await sendWpp(phone, parsed.reply ?? 'Não entendi. Tente "vendi 1 kit" ou "resumo".')
    return NextResponse.json({ ok: true })
  }

  // ── Resumo do mês ──
  if (parsed.action === 'summary') {
    const month = currentMonth()

    const [{ data: sales }, { data: costs }] = await Promise.all([
      supabase.from('sales').select('profit').eq('user_id', profile.user_id).eq('month', month),
      supabase.from('monthly_costs').select('total_costs').eq('user_id', profile.user_id).eq('month', month).single(),
    ])

    const grossProfit = (sales ?? []).reduce((s, r) => s + Number(r.profit), 0)
    const totalCosts = Number(costs?.total_costs ?? 0)
    const net = grossProfit - totalCosts
    const goalPct = profile.monthly_goal > 0 ? Math.round((net / profile.monthly_goal) * 100) : 0
    const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

    await sendWpp(phone,
      `📊 *Resumo de ${month}*\n\n` +
      `🛒 Vendas: ${(sales ?? []).length}\n` +
      `💵 Lucro bruto: ${fmt(grossProfit)}\n` +
      `📦 Custos mensais: ${fmt(totalCosts)}\n` +
      `✅ Lucro líquido: ${fmt(net)}\n` +
      `🎯 Meta: ${goalPct}% atingida\n\n` +
      (goalPct >= 100
        ? '🏆 Meta batida! Parabéns!'
        : `Faltam ${fmt(profile.monthly_goal - net)} para a meta`)
    )
    return NextResponse.json({ ok: true })
  }

  // ── Registro de venda ──
  if (parsed.action === 'sale') {
    const qty = Math.max(1, Number(parsed.quantity) || 1)
    const costPrice = Number(parsed.cost_price) || Number(profile.cost_price)
    const sellingPrice = Number(parsed.selling_price) || Number(profile.selling_price)
    const freightCost = Number(parsed.freight_cost) || 0
    const deliveryType = parsed.delivery_type || 'proprio'
    const today = new Date().toISOString().split('T')[0]

    const rows = Array.from({ length: qty }, () => ({
      user_id: profile.user_id,
      date: today,
      delivery_type: deliveryType,
      freight_cost: freightCost,
      cost_price: costPrice,
      selling_price: sellingPrice,
    }))

    const { error } = await supabase.from('sales').insert(rows)

    if (error) {
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
