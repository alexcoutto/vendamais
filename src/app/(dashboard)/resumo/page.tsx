import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CheckCircle, XCircle } from 'lucide-react'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default async function ResumoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: sales }, { data: costs }] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('sales').select('profit, month').eq('user_id', user.id),
    supabase.from('monthly_costs').select('month, total_costs').eq('user_id', user.id),
  ])

  const split = Number(profile?.partner_split ?? 50)
  const goal = Number(profile?.monthly_goal ?? 39000)

  // Agrupa vendas por mês
  const salesByMonth: Record<string, { count: number; gross: number }> = {}
  for (const s of sales ?? []) {
    if (!salesByMonth[s.month]) salesByMonth[s.month] = { count: 0, gross: 0 }
    salesByMonth[s.month].count++
    salesByMonth[s.month].gross += Number(s.profit)
  }

  const costsByMonth: Record<string, number> = {}
  for (const c of costs ?? []) {
    costsByMonth[c.month] = Number(c.total_costs)
  }

  const months = [...new Set([...Object.keys(salesByMonth), ...Object.keys(costsByMonth)])]
    .sort((a, b) => {
      const [am, ay] = a.split('/').map(Number)
      const [bm, by] = b.split('/').map(Number)
      return by !== ay ? by - ay : bm - am
    })

  const rows = months.map(month => {
    const gross = salesByMonth[month]?.gross ?? 0
    const totalCosts = costsByMonth[month] ?? 0
    const net = gross - totalCosts
    return {
      month,
      count: salesByMonth[month]?.count ?? 0,
      gross,
      totalCosts,
      net,
      myShare: net * (split / 100),
      partnerShare: net * ((100 - split) / 100),
      goalReached: net >= goal,
    }
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Resumo Mensal</h1>
        <p className="text-gray-500 mt-1">Resultado financeiro por mês</p>
      </div>

      {rows.length === 0 ? (
        <div className="text-center text-gray-400 py-20">Nenhum dado registrado ainda.</div>
      ) : (
        <div className="space-y-4">
          {rows.map(r => (
            <div key={r.month} className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b">
                <div className="flex items-center gap-3">
                  <h2 className="font-bold text-gray-900 text-lg">{r.month}</h2>
                  <span className="text-sm text-gray-500">{r.count} kit{r.count !== 1 ? 's' : ''} vendido{r.count !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-2">
                  {r.goalReached
                    ? <><CheckCircle className="w-4 h-4 text-green-500" /><span className="text-sm text-green-600 font-medium">Meta atingida</span></>
                    : <><XCircle className="w-4 h-4 text-gray-400" /><span className="text-sm text-gray-400">Meta não atingida</span></>
                  }
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 divide-x">
                {[
                  { label: 'Lucro bruto', value: fmt(r.gross), color: 'text-gray-900' },
                  { label: 'Custos', value: fmt(r.totalCosts), color: 'text-red-600' },
                  { label: 'Lucro líquido', value: fmt(r.net), color: 'text-green-700 font-bold' },
                  { label: `Sua parte (${split}%)`, value: fmt(r.myShare), color: 'text-orange-600 font-bold' },
                  { label: `Sócio (${100 - split}%)`, value: fmt(r.partnerShare), color: 'text-purple-600 font-bold' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="px-6 py-4">
                    <p className="text-xs text-gray-500 mb-1">{label}</p>
                    <p className={`text-base ${color}`}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
