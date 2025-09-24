#!/usr/bin/env node

// Check environment variables for member account creation
console.log('🔍 Checking environment variables...\n');

const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

let allPresent = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 20)}...`);
  } else {
    console.log(`❌ ${varName}: NOT SET`);
    allPresent = false;
  }
});

console.log('\n' + '='.repeat(50));

if (allPresent) {
  console.log('🎉 All required environment variables are present!');
  console.log('✅ Member account creation API should work properly.');
} else {
  console.log('⚠️  Missing environment variables detected!');
  console.log('❌ Member account creation will fail.');
  console.log('\nTo fix this:');
  console.log('1. Add SUPABASE_SERVICE_ROLE_KEY to your .env.local file');
  console.log('2. Get the service role key from Supabase Dashboard > Settings > API');
  console.log('3. Restart your development server');
}

console.log('\n📝 Note: SUPABASE_SERVICE_ROLE_KEY is only used server-side and is safe to include in your environment.');
