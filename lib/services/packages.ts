import { createBrowserSupabaseClient } from '@/lib/supabase-client'

// Types
export interface Package {
  id: string
  trainer_id: string
  name: string
  session_count: number
  price: number
  created_at: string
  updated_at?: string
}

export interface CreatePackageData {
  trainer_id: string
  name: string
  session_count: number
  price: number
}

export interface UpdatePackageData {
  name?: string
  session_count?: number
  price?: number
}

export interface ServiceResponse<T> {
  data: T | null
  error: string | null
}

export interface PackageWithPurchaseCount extends Package {
  purchase_count: number
}

// Error types
export class PackageError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'PackageError'
  }
}

export class PackageInUseError extends PackageError {
  constructor(packageId: string) {
    super(`Package ${packageId} cannot be deleted because it has active purchases`, 'PACKAGE_IN_USE')
    this.name = 'PackageInUseError'
  }
}

/**
 * Get all packages for a specific trainer
 */
export async function getPackagesByTrainer(trainerId: string): Promise<ServiceResponse<Package[]>> {
  try {
    const supabase = createBrowserSupabaseClient()
    
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching packages:', error)
      return {
        data: null,
        error: `Failed to fetch packages: ${error.message}`
      }
    }

    return {
      data: data || [],
      error: null
    }
  } catch (error) {
    console.error('Unexpected error in getPackagesByTrainer:', error)
    return {
      data: null,
      error: 'An unexpected error occurred while fetching packages'
    }
  }
}

/**
 * Create a new package
 */
export async function createPackage(data: CreatePackageData): Promise<ServiceResponse<Package>> {
  try {
    // Validation
    if (!data.name?.trim()) {
      return {
        data: null,
        error: 'Package name is required'
      }
    }

    if (!data.session_count || data.session_count < 1) {
      return {
        data: null,
        error: 'Session count must be at least 1'
      }
    }

    if (!data.price || data.price <= 0) {
      return {
        data: null,
        error: 'Price must be greater than 0'
      }
    }

    const supabase = createBrowserSupabaseClient()
    
    const { data: packageData, error } = await supabase
      .from('packages')
      .insert([{
        trainer_id: data.trainer_id,
        name: data.name.trim(),
        session_count: data.session_count,
        price: data.price
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating package:', error)
      return {
        data: null,
        error: `Failed to create package: ${error.message}`
      }
    }

    return {
      data: packageData,
      error: null
    }
  } catch (error) {
    console.error('Unexpected error in createPackage:', error)
    return {
      data: null,
      error: 'An unexpected error occurred while creating the package'
    }
  }
}

/**
 * Update an existing package
 */
export async function updatePackage(id: string, data: UpdatePackageData): Promise<ServiceResponse<Package>> {
  try {
    // Validation
    if (data.name !== undefined && !data.name.trim()) {
      return {
        data: null,
        error: 'Package name cannot be empty'
      }
    }

    if (data.session_count !== undefined && data.session_count < 1) {
      return {
        data: null,
        error: 'Session count must be at least 1'
      }
    }

    if (data.price !== undefined && data.price <= 0) {
      return {
        data: null,
        error: 'Price must be greater than 0'
      }
    }

    const supabase = createBrowserSupabaseClient()
    
    // Prepare update data (only include defined fields)
    const updateData: any = {}
    if (data.name !== undefined) updateData.name = data.name.trim()
    if (data.session_count !== undefined) updateData.session_count = data.session_count
    if (data.price !== undefined) updateData.price = data.price

    const { data: packageData, error } = await supabase
      .from('packages')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating package:', error)
      return {
        data: null,
        error: `Failed to update package: ${error.message}`
      }
    }

    if (!packageData) {
      return {
        data: null,
        error: 'Package not found'
      }
    }

    return {
      data: packageData,
      error: null
    }
  } catch (error) {
    console.error('Unexpected error in updatePackage:', error)
    return {
      data: null,
      error: 'An unexpected error occurred while updating the package'
    }
  }
}

/**
 * Check if a package has any active purchases
 */
export async function checkPackageHasPurchases(id: string): Promise<ServiceResponse<boolean>> {
  try {
    const supabase = createBrowserSupabaseClient()
    
    const { data, error } = await supabase
      .from('purchases')
      .select('id')
      .eq('package_id', id)
      .limit(1)

    if (error) {
      console.error('Error checking package purchases:', error)
      return {
        data: null,
        error: `Failed to check package purchases: ${error.message}`
      }
    }

    return {
      data: (data && data.length > 0),
      error: null
    }
  } catch (error) {
    console.error('Unexpected error in checkPackageHasPurchases:', error)
    return {
      data: null,
      error: 'An unexpected error occurred while checking package purchases'
    }
  }
}

/**
 * Get package with purchase count
 */
export async function getPackageWithPurchaseCount(id: string): Promise<ServiceResponse<PackageWithPurchaseCount>> {
  try {
    const supabase = createBrowserSupabaseClient()
    
    const { data, error } = await supabase
      .from('packages')
      .select(`
        *,
        purchases:purchases(count)
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching package with purchase count:', error)
      return {
        data: null,
        error: `Failed to fetch package: ${error.message}`
      }
    }

    if (!data) {
      return {
        data: null,
        error: 'Package not found'
      }
    }

    // Extract purchase count from the response
    const purchaseCount = data.purchases?.[0]?.count || 0

    return {
      data: {
        ...data,
        purchase_count: purchaseCount
      },
      error: null
    }
  } catch (error) {
    console.error('Unexpected error in getPackageWithPurchaseCount:', error)
    return {
      data: null,
      error: 'An unexpected error occurred while fetching package details'
    }
  }
}

/**
 * Delete a package if it has no active purchases
 */
export async function deletePackage(id: string): Promise<ServiceResponse<boolean>> {
  try {
    // First check if package has purchases
    const purchaseCheck = await checkPackageHasPurchases(id)
    
    if (purchaseCheck.error) {
      return {
        data: null,
        error: purchaseCheck.error
      }
    }

    if (purchaseCheck.data) {
      return {
        data: null,
        error: 'Cannot delete package because it has active purchases'
      }
    }

    const supabase = createBrowserSupabaseClient()
    
    const { error } = await supabase
      .from('packages')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting package:', error)
      return {
        data: null,
        error: `Failed to delete package: ${error.message}`
      }
    }

    return {
      data: true,
      error: null
    }
  } catch (error) {
    console.error('Unexpected error in deletePackage:', error)
    return {
      data: null,
      error: 'An unexpected error occurred while deleting the package'
    }
  }
}

/**
 * Get package statistics for a trainer
 */
export async function getPackageStats(trainerId: string): Promise<ServiceResponse<{
  totalPackages: number
  totalValue: number
  averagePrice: number
  mostPopularPackage?: Package
}>> {
  try {
    const supabase = createBrowserSupabaseClient()
    
    // Get all packages for the trainer
    const { data: packages, error } = await supabase
      .from('packages')
      .select(`
        *,
        purchases:purchases(count)
      `)
      .eq('trainer_id', trainerId)

    if (error) {
      console.error('Error fetching package stats:', error)
      return {
        data: null,
        error: `Failed to fetch package statistics: ${error.message}`
      }
    }

    if (!packages || packages.length === 0) {
      return {
        data: {
          totalPackages: 0,
          totalValue: 0,
          averagePrice: 0
        },
        error: null
      }
    }

    // Calculate statistics
    const totalPackages = packages.length
    const totalValue = packages.reduce((sum, pkg) => sum + pkg.price, 0)
    const averagePrice = totalValue / totalPackages

    // Find most popular package (with most purchases)
    let mostPopularPackage: Package | undefined
    let maxPurchases = 0

    packages.forEach(pkg => {
      const purchaseCount = pkg.purchases?.[0]?.count || 0
      if (purchaseCount > maxPurchases) {
        maxPurchases = purchaseCount
        mostPopularPackage = pkg
      }
    })

    return {
      data: {
        totalPackages,
        totalValue,
        averagePrice,
        mostPopularPackage
      },
      error: null
    }
  } catch (error) {
    console.error('Unexpected error in getPackageStats:', error)
    return {
      data: null,
      error: 'An unexpected error occurred while fetching package statistics'
    }
  }
}

/**
 * Validate package data
 */
export function validatePackageData(data: Partial<CreatePackageData>): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!data.name?.trim()) {
    errors.push('Package name is required')
  }

  if (data.session_count !== undefined && (data.session_count < 1 || !Number.isInteger(data.session_count))) {
    errors.push('Session count must be a positive integer')
  }

  if (data.price !== undefined && (data.price <= 0 || isNaN(data.price))) {
    errors.push('Price must be a positive number')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
} 