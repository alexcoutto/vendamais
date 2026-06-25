'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Trash2 } from 'lucide-react'
import type { Sale } from '@/types'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')
}

export default function SalesList({ sales }: { sales: Sale[] }) {
  const router = useRouter()

  async function handleDelete(id: string) {
    if (!confirm('Remover esta venda?')) return
    const supabase = createClient()
    await supabase.from('sales').delete().eq('id', id)
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Últimas vendas ({sales.length})</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {sales.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-12">Nenhuma venda registrada ainda.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead>Entrega</TableHead>
                <TableHead>Frete</TableHead>
                <TableHead>Lucro</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map(sale => (
                <TableRow key={sale.id}>
                  <TableCell className="text-sm">{fmtDate(sale.date)}</TableCell>
                  <TableCell className="text-sm text-gray-500">{sale.order_number ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={sale.delivery_type === 'proprio' ? 'secondary' : 'outline'} className="text-xs">
                      {sale.delivery_type === 'proprio' ? 'Própria' : 'Transportadora'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{fmt(sale.freight_cost)}</TableCell>
                  <TableCell className="text-sm font-bold text-green-700">{fmt(sale.profit)}</TableCell>
                  <TableCell>
                    <button onClick={() => handleDelete(sale.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
