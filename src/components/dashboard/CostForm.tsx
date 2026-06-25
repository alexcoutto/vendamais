'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function currentMonth() {
  const d = new Date()
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

interface CostRow { id: string; month: string; traffic_cost: number; other_costs: number; other_description: string | null }

export default function CostForm({ existingCosts }: { existingCosts: CostRow[] }) {
  const router = useRouter()
  const [form, setForm] = useState({
    month: currentMonth(),
    traffic_cost: '',
    other_costs: '',
    other_description: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    const existing = existingCosts.find(c => c.month === form.month)

    const payload = {
      month: form.month,
      traffic_cost: Number(form.traffic_cost) || 0,
      other_costs: Number(form.other_costs) || 0,
      other_description: form.other_description || null,
    }

    if (existing) {
      await supabase.from('monthly_costs').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('monthly_costs').insert(payload)
    }

    setLoading(false)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 2000)
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Registrar custos</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Mês (MM/AAAA)</Label>
            <Input
              value={form.month}
              onChange={e => set('month', e.target.value)}
              placeholder="06/2026"
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label>Tráfego pago (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.traffic_cost}
              onChange={e => set('traffic_cost', e.target.value)}
              placeholder="4500"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Outros gastos (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.other_costs}
              onChange={e => set('other_costs', e.target.value)}
              placeholder="0"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Descrição dos outros gastos</Label>
            <Input
              value={form.other_description}
              onChange={e => set('other_description', e.target.value)}
              placeholder="Ex: embalagens, taxa"
              className="mt-1"
            />
          </div>
          <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700" disabled={loading}>
            {loading ? 'Salvando...' : success ? '✓ Salvo!' : 'Salvar custos'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
