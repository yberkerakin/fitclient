import { createBrowserSupabaseClient } from '@/lib/supabase-client';

const supabase = createBrowserSupabaseClient();

// Create member account
export async function createMemberAccount(
  clientId: string,
  email: string,
  password: string
) {
  // First, create auth user using signUp
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: undefined // Don't redirect, we'll handle email confirmation differently
    }
  });

  if (authError) throw new Error(authError.message);
  if (!authData.user) throw new Error('Auth kullanıcısı oluşturulamadı');

  // Then create member_accounts record
  const { data, error } = await supabase
    .from('member_accounts')
    .insert({
      client_id: clientId,
      email: email,
      password_hash: 'handled_by_auth', // Password is handled by Supabase Auth
      is_active: true
    })
    .select()
    .single();

  if (error) {
    // If member_accounts creation fails, we should clean up the auth user
    // Note: We can't delete the auth user from client side, but the account will be inactive
    throw new Error(`Üye hesabı oluşturulamadı: ${error.message}`);
  }

  return data;
}

// Authenticate member
export async function authenticateMember(email: string, password: string) {
  // First authenticate with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (authError || !authData.user) {
    // Pass through the original Supabase error message for translation
    throw new Error(authError?.message || 'Geçersiz email veya şifre');
  }

  // Then get member account details
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

  if (error) throw new Error('Üye hesabı bulunamadı');
  if (!account) throw new Error('Üye hesabı bulunamadı');

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

  // Handle password updates through Supabase Auth
  if (updates.password) {
    const { error: passwordError } = await supabase.auth.updateUser({
      password: updates.password
    });
    
    if (passwordError) {
      throw new Error(`Şifre güncellenemedi: ${passwordError.message}`);
    }
    
    // Don't update password_hash in database since it's handled by auth
    delete updateData.password;
  }

  // Handle email updates through Supabase Auth
  if (updates.email) {
    const { error: emailError } = await supabase.auth.updateUser({
      email: updates.email
    });
    
    if (emailError) {
      throw new Error(`Email güncellenemedi: ${emailError.message}`);
    }
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
