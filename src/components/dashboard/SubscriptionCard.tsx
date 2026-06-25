'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Profile {
  subscription_status: string
  trial_end_date: string | null
  subscription_end_date: string | null
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

const statusLabel: Record<string, { label: string; color: string }> = {
  trial:     { label: 'Trial gratuito', color: 'bg-blue-100 text-blue-700' },
  active:    { label: 'Ativo',          color: 'bg-green-100 text-green-700' },
  expired:   { label: 'Expirado',       color: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelado',      color: 'bg-gray-100 text-gray-700' },
}

export default function SubscriptionCard({ profile, email }: { profile: Profile | null; email: string }) {
  const [loading, setLoading] = useState(false)
  const status = profile?.subscription_status ?? 'trial'
  const info = statusLabel[status] ?? statusLabel.trial

  async function handleCheckout() {
    setLoading(true)
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const { url } = await res.json()
    if (url) window.location.href = url
    else setLoading(false)
  }

  return (
    <Card id="plano">
      <CardHeader>
        <CardTitle className="text-base">Minha assinatura</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">Status:</span>
          <Badge className={info.color}>{info.label}</Badge>
        </div>

        {status === 'trial' && profile?.trial_end_date && (
          <p className="text-sm text-gray-500">
            Trial expira em: <strong>{fmtDate(profile.trial_end_date)}</strong>
          </p>
        )}

        {status === 'active' && profile?.subscription_end_date && (
          <p className="text-sm text-gray-500">
            Próxima cobrança: <strong>{fmtDate(profile.subscription_end_date)}</strong>
          </p>
        )}

        <div className="border rounded-lg p-4 bg-orange-50">
          <p className="text-sm font-semibold text-gray-900 mb-1">Plano Mensal</p>
          <p className="text-2xl font-bold text-orange-600">R$ 29<span className="text-sm font-normal text-gray-500">/mês</span></p>
          <p className="text-xs text-gray-500 mt-1">PIX ou cartão de crédito via Mercado Pago</p>
        </div>

        {status !== 'active' && (
          <Button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-700"
          >
            {loading ? 'Redirecionando...' : 'Assinar agora — R$ 29/mês'}
          </Button>
        )}

        {status === 'active' && (
          <p className="text-xs text-gray-400 text-center">Para cancelar, entre em contato pelo WhatsApp.</p>
        )}
      </CardContent>
    </Card>
  )
}
