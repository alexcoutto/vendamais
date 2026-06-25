import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TrendingUp, ShoppingBag, DollarSign, Target } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function currentMonth() {
  const d = new Date()
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const month = currentMonth()

  const [{ data: profile }, { data: sales }, { data: cost }] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('sales').select('profit').eq('user_id', user.id).eq('month', month),
    supabase.from('monthly_costs').select('total_costs').eq('user_id', user.id).eq('month', month).maybeSingle(),
  ])

  const grossProfit = sales?.reduce((s, r) => s + Number(r.profit), 0) ?? 0
  const totalCosts = Number(cost?.total_costs ?? 0)
  const netProfit = grossProfit - totalCosts
  const split = profile?.partner_split ?? 50
  const myShare = netProfit * (split / 100)
  const monthlyGoal = Number(profile?.monthly_goal ?? 39000)
  const goalPct = Math.min(Math.round((netProfit / monthlyGoal) * 100), 100)

  const stats = [
    { label: 'Kits vendidos', value: String(sales?.length ?? 0), icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Lucro bruto', value: fmt(grossProfit), icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Lucro líquido', value: fmt(netProfit), icon: DollarSign, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Sua parte', value: fmt(myShare), icon: Target, color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Mês atual: {month}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-500">{label}</CardTitle>
                <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-gray-900">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Meta do mês */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Meta do mês — {fmt(monthlyGoal)} líquido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-gray-100 rounded-full h-4">
              <div
                className={`h-4 rounded-full transition-all ${goalPct >= 100 ? 'bg-green-500' : 'bg-orange-500'}`}
                style={{ width: `${goalPct}%` }}
              />
            </div>
            <span className={`text-sm font-bold ${goalPct >= 100 ? 'text-green-600' : 'text-orange-600'}`}>
              {goalPct}%
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            {goalPct >= 100 ? '✅ Meta atingida!' : `Faltam ${fmt(monthlyGoal - netProfit)} para a meta`}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
