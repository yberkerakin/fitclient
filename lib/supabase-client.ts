import { createBrowserClient } from '@supabase/ssr'
import { Database } from './types'

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Browser client for client components
export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}

// Type exports
export type SupabaseClient = ReturnType<typeof createBrowserSupabaseClient> 