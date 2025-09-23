-- Check email confirmation settings in Supabase
-- Run this in Supabase SQL Editor to verify configuration

-- Check auth configuration (this will show current settings)
SELECT 
  'Email confirmation enabled' as setting,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM auth.config 
      WHERE key = 'SITE_URL' 
    ) THEN 'Yes (check Auth settings in dashboard)'
    ELSE 'No (check Auth settings in dashboard)'
  END as value

UNION ALL

-- Check if we have any users with unconfirmed emails
SELECT 
  'Users with unconfirmed emails' as setting,
  COUNT(*)::text as value
FROM auth.users 
WHERE email_confirmed_at IS NULL

UNION ALL

-- Check total auth users
SELECT 
  'Total auth users' as setting,
  COUNT(*)::text as value
FROM auth.users;

-- Show recent signups and their confirmation status
SELECT 
  email,
  email_confirmed_at,
  created_at,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN 'Confirmed'
    ELSE 'Pending confirmation'
  END as status
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 10;
