-- Fix member_accounts table for Supabase Auth integration
-- This script addresses the password_hash column issues

-- =====================================================
-- 1. DIAGNOSTIC QUERIES - Check current state
-- =====================================================

-- Check if member_accounts table exists and its structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'member_accounts' 
ORDER BY ordinal_position;

-- Check current member_accounts data
SELECT 
    ma.id,
    ma.client_id,
    ma.email,
    ma.password_hash,
    ma.is_active,
    ma.created_at,
    c.name as client_name
FROM member_accounts ma
LEFT JOIN clients c ON c.id = ma.client_id
ORDER BY ma.created_at DESC;

-- Check for any NULL password_hash values
SELECT COUNT(*) as null_password_count
FROM member_accounts 
WHERE password_hash IS NULL;

-- Check for any problematic password_hash values
SELECT DISTINCT password_hash
FROM member_accounts
WHERE password_hash IS NOT NULL;

-- =====================================================
-- 2. FIX PASSWORD_HASH COLUMN
-- =====================================================

-- Option 1: Make password_hash nullable (recommended)
-- This allows us to not store passwords since Supabase Auth handles them
ALTER TABLE member_accounts 
ALTER COLUMN password_hash DROP NOT NULL;

-- Option 2: Set default value for existing NULL entries
UPDATE member_accounts 
SET password_hash = 'managed_by_supabase_auth' 
WHERE password_hash IS NULL OR password_hash = '';

-- =====================================================
-- 3. UPDATE EXISTING RECORDS
-- =====================================================

-- Update all existing records to use the new auth-managed indicator
UPDATE member_accounts 
SET password_hash = 'managed_by_supabase_auth'
WHERE password_hash != 'managed_by_supabase_auth' 
  AND password_hash != 'handled_by_auth';

-- =====================================================
-- 4. VERIFY FIXES
-- =====================================================

-- Verify the table structure after changes
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'member_accounts' 
  AND column_name = 'password_hash';

-- Verify all records have proper password_hash values
SELECT 
    ma.id,
    ma.email,
    ma.password_hash,
    c.name as client_name
FROM member_accounts ma
LEFT JOIN clients c ON c.id = ma.client_id
ORDER BY ma.created_at DESC;

-- Count records by password_hash status
SELECT 
    password_hash,
    COUNT(*) as count
FROM member_accounts
GROUP BY password_hash;

-- =====================================================
-- 5. CHECK FOR DATA INTEGRITY ISSUES
-- =====================================================

-- Check for orphaned member_accounts (clients that don't exist)
SELECT ma.*
FROM member_accounts ma
LEFT JOIN clients c ON c.id = ma.client_id
WHERE c.id IS NULL;

-- Check for duplicate emails
SELECT email, COUNT(*) as count
FROM member_accounts
GROUP BY email
HAVING COUNT(*) > 1;

-- Check for clients with multiple member accounts
SELECT client_id, COUNT(*) as count
FROM member_accounts
GROUP BY client_id
HAVING COUNT(*) > 1;

-- =====================================================
-- 6. CLEANUP QUERIES (if needed)
-- =====================================================

-- Remove orphaned member_accounts (uncomment if needed)
-- DELETE FROM member_accounts 
-- WHERE client_id NOT IN (SELECT id FROM clients);

-- Remove duplicate member_accounts (keep the latest one)
-- DELETE FROM member_accounts 
-- WHERE id NOT IN (
--     SELECT DISTINCT ON (client_id) id 
--     FROM member_accounts 
--     ORDER BY client_id, created_at DESC
-- );

-- =====================================================
-- 7. FINAL VERIFICATION
-- =====================================================

-- Final check: All member accounts should be properly configured
SELECT 
    'Total member accounts' as metric,
    COUNT(*) as count
FROM member_accounts

UNION ALL

SELECT 
    'Active member accounts' as metric,
    COUNT(*) as count
FROM member_accounts
WHERE is_active = true

UNION ALL

SELECT 
    'Accounts with auth-managed passwords' as metric,
    COUNT(*) as count
FROM member_accounts
WHERE password_hash = 'managed_by_supabase_auth' 
   OR password_hash = 'handled_by_auth'

UNION ALL

SELECT 
    'Accounts linked to existing clients' as metric,
    COUNT(*) as count
FROM member_accounts ma
JOIN clients c ON c.id = ma.client_id;

-- Show final state of member_accounts
SELECT 
    ma.id,
    ma.email,
    ma.password_hash,
    ma.is_active,
    ma.created_at,
    c.name as client_name
FROM member_accounts ma
LEFT JOIN clients c ON c.id = ma.client_id
ORDER BY ma.created_at DESC;
