import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CostForm from '@/components/dashboard/CostForm'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default async function CustosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: costs } = await supabase
    .from('monthly_costs')
    .select('*')
    .eq('user_id', user.id)
    .order('month', { ascending: false })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Custos Mensais</h1>
        <p className="text-gray-500 mt-1">Registre tráfego pago e outros gastos por mês</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <CostForm existingCosts={costs ?? []} />
        </div>
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-900">Histórico de custos</h2>
            </div>
            {!costs?.length ? (
              <p className="text-center text-gray-400 text-sm py-12">Nenhum custo registrado ainda.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-6 py-3 text-gray-500 font-medium">Mês</th>
                    <th className="text-right px-6 py-3 text-gray-500 font-medium">Tráfego</th>
                    <th className="text-right px-6 py-3 text-gray-500 font-medium">Outros</th>
                    <th className="text-right px-6 py-3 text-gray-500 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {costs.map(c => (
                    <tr key={c.id} className="border-t hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{c.month}</td>
                      <td className="px-6 py-4 text-right text-gray-600">{fmt(c.traffic_cost)}</td>
                      <td className="px-6 py-4 text-right text-gray-600">{fmt(c.other_costs)}</td>
                      <td className="px-6 py-4 text-right font-bold text-red-600">{fmt(c.total_costs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
