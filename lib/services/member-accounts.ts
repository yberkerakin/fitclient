import { supabase } from '@/lib/supabase-client';
import bcrypt from 'bcryptjs';

// Create member account
export async function createMemberAccount(
  clientId: string,
  email: string,
  password: string
) {
  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from('member_accounts')
    .insert({
      client_id: clientId,
      email: email,
      password_hash: passwordHash,
      is_active: true
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Authenticate member
export async function authenticateMember(email: string, password: string) {
  const { data: account, error } = await supabase
    .from('member_accounts')
    .select(`
      *,
      clients!inner (
        id,
        name,
        trainer_id
      )
    `)
    .eq('email', email)
    .eq('is_active', true)
    .single();

  if (error) throw new Error('Geçersiz email veya şifre');
  if (!account) throw new Error('Hesap bulunamadı');

  // Verify password
  const isValidPassword = await bcrypt.compare(password, account.password_hash);
  if (!isValidPassword) throw new Error('Geçersiz email veya şifre');

  // Return account without password hash
  const { password_hash, ...accountWithoutPassword } = account;
  return accountWithoutPassword;
}

// Get member account by client ID
export async function getMemberAccountByClientId(clientId: string) {
  const { data, error } = await supabase
    .from('member_accounts')
    .select('id, client_id, email, is_active, created_at')
    .eq('client_id', clientId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
  return data;
}

// Update member account
export async function updateMemberAccount(
  accountId: string,
  updates: {
    email?: string;
    password?: string;
    is_active?: boolean;
  }
) {
  const updateData: any = { ...updates };

  // Hash password if provided
  if (updates.password) {
    updateData.password_hash = await bcrypt.hash(updates.password, 10);
    delete updateData.password;
  }

  const { data, error } = await supabase
    .from('member_accounts')
    .update(updateData)
    .eq('id', accountId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Deactivate member account
export async function deactivateMemberAccount(accountId: string) {
  const { error } = await supabase
    .from('member_accounts')
    .update({ is_active: false })
    .eq('id', accountId);

  if (error) throw error;
}

// Check if email is already in use
export async function isEmailInUse(email: string) {
  const { data, error } = await supabase
    .from('member_accounts')
    .select('id')
    .eq('email', email)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
  return !!data;
}
