'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// Server Action with toast feedback
export async function addClientAction(formData: FormData) {
  try {
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string

    // Validate input
    if (!name || !email) {
      throw new Error('Name and email are required')
    }

    // TODO: Add client to database
    // const client = await supabase.from('clients').insert({...})

    revalidatePath('/dashboard/clients')
    
    // Return success message for client-side toast
    return { success: true, message: 'Client added successfully!' }
  } catch (error) {
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to add client' 
    }
  }
}

export async function checkInClientAction(clientId: string) {
  try {
    // TODO: Check if client has remaining sessions
    // const client = await supabase.from('clients').select('*').eq('id', clientId).single()
    
    // TODO: Create session record
    // await supabase.from('sessions').insert({...})
    
    // TODO: Update remaining sessions
    // await supabase.from('purchases').update({...})
    
    revalidatePath('/dashboard')
    
    return { success: true, message: 'Client checked in successfully!' }
  } catch (error) {
    return { 
      success: false, 
      message: 'Failed to check in client. No remaining sessions.' 
    }
  }
}

export async function createPackageAction(formData: FormData) {
  try {
    const name = formData.get('name') as string
    const sessionCount = parseInt(formData.get('session_count') as string)
    const price = parseFloat(formData.get('price') as string)

    if (!name || sessionCount <= 0 || price <= 0) {
      throw new Error('Invalid package data')
    }

    // TODO: Add package to database
    // const package = await supabase.from('packages').insert({...})

    revalidatePath('/dashboard/packages')
    
    return { success: true, message: 'Package created successfully!' }
  } catch (error) {
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to create package' 
    }
  }
} 