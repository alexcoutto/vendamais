import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/dashboard/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, trial_end_date, subscription_end_date')
    .eq('user_id', user.id)
    .single()

  const now = new Date()
  const isActive =
    profile?.subscription_status === 'active' ||
    (profile?.subscription_status === 'trial' &&
      profile?.trial_end_date &&
      new Date(profile.trial_end_date) > now)

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {!isActive && (
          <div className="bg-orange-600 text-white text-sm text-center py-2 px-4">
            Seu período grátis expirou.{' '}
            <a href="/configuracoes#plano" className="underline font-semibold">Assine agora para continuar usando.</a>
          </div>
        )}
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
