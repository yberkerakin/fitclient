#!/usr/bin/env node

/**
 * Environment Variables Verification Script
 * 
 * This script helps verify that all required environment variables
 * are set correctly for the fitness-saas application.
 * 
 * Usage:
 *   node scripts/verify-env.js
 */

console.log('🔍 ===== ENVIRONMENT VARIABLES VERIFICATION =====\n')

// Required environment variables
const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_APP_URL'
]

// Optional environment variables
const optionalVars = [
  'VERCEL_ENV',
  'VERCEL_URL',
  'NODE_ENV'
]

console.log('📋 Required Environment Variables:')
let allRequiredSet = true

requiredVars.forEach(varName => {
  const value = process.env[varName]
  const isSet = !!value
  const status = isSet ? '✅ SET' : '❌ NOT SET'
  const preview = isSet ? `${value.substring(0, 20)}...` : 'undefined'
  
  console.log(`   ${varName}: ${status}`)
  console.log(`      Preview: ${preview}`)
  
  if (!isSet) {
    allRequiredSet = false
  }
})

console.log('\n📋 Optional Environment Variables:')
optionalVars.forEach(varName => {
  const value = process.env[varName]
  const isSet = !!value
  const status = isSet ? '✅ SET' : '⚠️  NOT SET'
  const preview = isSet ? value : 'undefined'
  
  console.log(`   ${varName}: ${status}`)
  console.log(`      Value: ${preview}`)
})

console.log('\n🔍 Environment Analysis:')

// Check if we're in production
const isProduction = process.env.NODE_ENV === 'production'
const isVercel = !!process.env.VERCEL_ENV

console.log(`   - Environment: ${process.env.NODE_ENV || 'development'}`)
console.log(`   - Production: ${isProduction ? 'Yes' : 'No'}`)
console.log(`   - Vercel: ${isVercel ? 'Yes' : 'No'}`)
console.log(`   - Vercel Environment: ${process.env.VERCEL_ENV || 'N/A'}`)

// Check Supabase URL format
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
if (supabaseUrl) {
  const isValidUrl = supabaseUrl.startsWith('https://') && supabaseUrl.includes('.supabase.co')
  console.log(`   - Supabase URL valid: ${isValidUrl ? 'Yes' : 'No'}`)
}

// Check Supabase key format
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (supabaseKey) {
  const isValidKey = supabaseKey.startsWith('eyJ') && supabaseKey.length > 100
  console.log(`   - Supabase key valid: ${isValidKey ? 'Yes' : 'No'}`)
}

// Check app URL format
const appUrl = process.env.NEXT_PUBLIC_APP_URL
if (appUrl) {
  const isValidAppUrl = appUrl.startsWith('http')
  console.log(`   - App URL valid: ${isValidAppUrl ? 'Yes' : 'No'}`)
}

console.log('\n📊 Summary:')
if (allRequiredSet) {
  console.log('✅ All required environment variables are set!')
  
  if (isProduction && !isVercel) {
    console.log('⚠️  Running in production but not on Vercel')
  } else if (isVercel) {
    console.log('✅ Running on Vercel with proper environment')
  } else {
    console.log('✅ Running in development environment')
  }
} else {
  console.log('❌ Some required environment variables are missing!')
  console.log('   Please set the missing variables in your environment.')
  
  if (isVercel) {
    console.log('\n🔧 For Vercel deployment:')
    console.log('   1. Go to your Vercel project dashboard')
    console.log('   2. Navigate to Settings > Environment Variables')
    console.log('   3. Add the missing variables')
    console.log('   4. Redeploy your application')
  } else {
    console.log('\n🔧 For local development:')
    console.log('   1. Create a .env.local file in your project root')
    console.log('   2. Add the missing variables')
    console.log('   3. Restart your development server')
  }
}

console.log('\n🔗 ===== END ENVIRONMENT VERIFICATION =====') 