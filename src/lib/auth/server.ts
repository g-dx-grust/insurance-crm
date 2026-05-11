import 'server-only'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function getSessionUserOrRedirect() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login?error=no_profile')
  return { user, profile }
}

export async function getCurrentTenantId() {
  const { profile } = await getSessionUserOrRedirect()
  return profile.tenant_id
}
