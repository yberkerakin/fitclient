import { createBrowserSupabaseClient } from '@/lib/supabase-client';

export async function getMemberSession() {
  const supabase = createBrowserSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;

  // Check if this is a member account
  const { data: memberAccount } = await supabase
    .from('member_accounts')
    .select('*, client:clients(*)')
    .eq('email', user.email)
    .single();

  return memberAccount;
}

export async function requireMemberAuth() {
  const session = await getMemberSession();
  
  if (!session) {
    throw new Error('Unauthorized - Member access required');
  }
  
  return session;
}

export function isMemberRoute(pathname: string) {
  return pathname.startsWith('/member');
}

export function isTrainerRoute(pathname: string) {
  return pathname.startsWith('/dashboard');
}
