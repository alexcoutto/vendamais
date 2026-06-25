'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Props {
  defaultCostPrice: number
  defaultSellingPrice: number
  productName: string
}

export default function SaleForm({ defaultCostPrice, defaultSellingPrice, productName }: Props) {
  const router = useRouter()
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    order_number: '',
    delivery_type: 'proprio',
    freight_cost: '0',
    cost_price: String(defaultCostPrice),
    selling_price: String(defaultSellingPrice),
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const profit =
    Number(form.selling_price) - Number(form.cost_price) - Number(form.freight_cost)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.from('sales').insert({
      date: form.date,
      order_number: form.order_number || null,
      delivery_type: form.delivery_type,
      freight_cost: Number(form.freight_cost),
      cost_price: Number(form.cost_price),
      selling_price: Number(form.selling_price),
    })

    setLoading(false)
    if (!error) {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
      set('order_number', '')
      set('freight_cost', form.delivery_type === 'proprio' ? '0' : form.freight_cost)
      router.refresh()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Nova venda</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Data</Label>
            <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} className="mt-1" required />
          </div>

          <div>
            <Label>Nº do pedido (opcional)</Label>
            <Input value={form.order_number} onChange={e => set('order_number', e.target.value)} placeholder="001" className="mt-1" />
          </div>

          <div>
            <Label>Tipo de entrega</Label>
            <Select value={form.delivery_type} onValueChange={v => { if (v) { set('delivery_type', v); if (v === 'proprio') set('freight_cost', '0') } }}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="proprio">Entrega própria</SelectItem>
                <SelectItem value="transportadora">Transportadora</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.delivery_type === 'transportadora' && (
            <div>
              <Label>Custo do frete (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.freight_cost}
                onChange={e => set('freight_cost', e.target.value)}
                className="mt-1"
              />
            </div>
          )}

          <div>
            <Label>Custo do {productName} (R$)</Label>
            <Input type="number" step="0.01" value={form.cost_price} onChange={e => set('cost_price', e.target.value)} className="mt-1" required />
          </div>

          <div>
            <Label>Preço de venda (R$)</Label>
            <Input type="number" step="0.01" value={form.selling_price} onChange={e => set('selling_price', e.target.value)} className="mt-1" required />
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-700 font-medium">
              Lucro desta venda:{' '}
              <span className="text-lg font-bold">
                {profit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </p>
          </div>

          <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700" disabled={loading}>
            {loading ? 'Salvando...' : success ? '✓ Salvo!' : 'Registrar venda'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
