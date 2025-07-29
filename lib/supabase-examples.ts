// Example usage of the new Supabase SSR clients

// Client Component Example
'use client'
import { createBrowserSupabaseClient } from './supabase-client'
import { useEffect, useState } from 'react'
import { Client } from './types'

export function useClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserSupabaseClient()

  useEffect(() => {
    async function fetchClients() {
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        setClients(data || [])
      } catch (error) {
        console.error('Error fetching clients:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchClients()
  }, [supabase])

  return { clients, loading }
}

// Server Component Example
import { createServerSupabaseClient } from './supabase-server'

export async function getClients(): Promise<Client[]> {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching clients:', error)
    return []
  }

  return data || []
}

// Route Handler Example
import { createRouteHandlerSupabaseClient } from './supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerSupabaseClient()
    const { name, email, phone } = await request.json()

    const { data, error } = await supabase
      .from('clients')
      .insert([{ name, email, phone }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create client' },
      { status: 500 }
    )
  }
}

// Authentication Example
export async function signIn(email: string, password: string) {
  const supabase = createBrowserSupabaseClient()
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  return { data, error }
}

export async function signUp(email: string, password: string, name: string) {
  const supabase = createBrowserSupabaseClient()
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
    },
  })

  return { data, error }
}

export async function signOut() {
  const supabase = createBrowserSupabaseClient()
  
  const { error } = await supabase.auth.signOut()
  return { error }
} 