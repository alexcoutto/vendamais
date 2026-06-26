'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Profile {
  product_name: string
  cost_price: number
  selling_price: number
  partner_split: number
  monthly_goal: number
  full_name: string | null
  phone: string | null
}

export default function SettingsForm({ profile }: { profile: Profile | null }) {
  const router = useRouter()
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? '',
    product_name: profile?.product_name ?? '',
    cost_price: String(profile?.cost_price ?? ''),
    selling_price: String(profile?.selling_price ?? ''),
    partner_split: String(profile?.partner_split ?? 50),
    monthly_goal: String(profile?.monthly_goal ?? 39000),
    phone: profile?.phone ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [saveError, setSaveError] = useState('')

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setSaveError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaveError('Sessão expirada. Faça login novamente.'); setLoading(false); return }

    const { error } = await supabase.from('profiles').update({
      full_name: form.full_name,
      product_name: form.product_name,
      cost_price: Number(form.cost_price),
      selling_price: Number(form.selling_price),
      partner_split: Number(form.partner_split),
      monthly_goal: Number(form.monthly_goal),
      phone: form.phone.replace(/\D/g, '') || null,
    }).eq('user_id', user.id)

    setLoading(false)
    if (error) {
      setSaveError(error.message)
    } else {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
      router.refresh()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Meu negócio</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Seu nome</Label>
            <Input value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="João Silva" className="mt-1" />
          </div>
          <div>
            <Label>Nome do produto</Label>
            <Input value={form.product_name} onChange={e => set('product_name', e.target.value)} placeholder="Kit de Panelas" className="mt-1" />
          </div>
          <div>
            <Label>Custo do produto (R$)</Label>
            <Input type="number" step="0.01" value={form.cost_price} onChange={e => set('cost_price', e.target.value)} placeholder="458" className="mt-1" />
          </div>
          <div>
            <Label>Preço de venda (R$)</Label>
            <Input type="number" step="0.01" value={form.selling_price} onChange={e => set('selling_price', e.target.value)} placeholder="1300" className="mt-1" />
          </div>
          <div>
            <Label>Sua % no lucro</Label>
            <Input type="number" min="0" max="100" value={form.partner_split} onChange={e => set('partner_split', e.target.value)} placeholder="50" className="mt-1" />
            <p className="text-xs text-gray-400 mt-1">Sócio recebe {100 - Number(form.partner_split)}%</p>
          </div>
          <div>
            <Label>Meta mensal de lucro líquido (R$)</Label>
            <Input type="number" step="0.01" value={form.monthly_goal} onChange={e => set('monthly_goal', e.target.value)} placeholder="39000" className="mt-1" />
          </div>
          <div>
            <Label>WhatsApp (com DDD e código do país)</Label>
            <Input
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              placeholder="5511999999999"
              className="mt-1"
            />
            <p className="text-xs text-gray-400 mt-1">Cadastre para registrar vendas direto pelo WhatsApp</p>
          </div>

          {saveError && <p className="text-red-500 text-sm">{saveError}</p>}

          <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700" disabled={loading}>
            {loading ? 'Salvando...' : success ? '✓ Salvo!' : 'Salvar configurações'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
