import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsForm from '@/components/dashboard/SettingsForm'
import SubscriptionCard from '@/components/dashboard/SubscriptionCard'

export default async function ConfiguracoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-500 mt-1">Ajuste seu produto, metas e assinatura</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 max-w-3xl">
        <SettingsForm profile={profile} />
        <SubscriptionCard profile={profile} email={user.email ?? ''} />
      </div>
    </div>
  )
}
