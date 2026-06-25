import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SaleForm from '@/components/dashboard/SaleForm'
import SalesList from '@/components/dashboard/SalesList'

export default async function VendasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('cost_price, selling_price, product_name')
    .eq('user_id', user.id)
    .single()

  const { data: sales } = await supabase
    .from('sales')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(50)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Vendas</h1>
        <p className="text-gray-500 mt-1">Registre cada venda realizada</p>
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <SaleForm
            defaultCostPrice={profile?.cost_price ?? 0}
            defaultSellingPrice={profile?.selling_price ?? 0}
            productName={profile?.product_name ?? 'Produto'}
          />
        </div>
        <div className="lg:col-span-2">
          <SalesList sales={sales ?? []} />
        </div>
      </div>
    </div>
  )
}
