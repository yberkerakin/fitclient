import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Create admin client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: Request) {
  try {
    const { email, password, clientId } = await request.json();

    // Validate required fields
    if (!email || !password || !clientId) {
      return NextResponse.json(
        { error: 'Email, password, and clientId are required' },
        { status: 400 }
      );
    }

    // Create auth user without affecting current session
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true
    });

    if (authError) throw authError;

    // Create member_accounts record
    const { error: memberError } = await supabaseAdmin
      .from('member_accounts')
      .insert({
        client_id: clientId,
        email: email,
        password_hash: 'managed_by_supabase_auth',
        is_active: true
      });

    if (memberError) {
      // Rollback - delete auth user
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      throw memberError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Member creation error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
