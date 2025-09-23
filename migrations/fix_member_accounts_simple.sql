-- Simple fix for member_accounts table
-- Execute this in Supabase SQL editor

-- 1. Make password_hash nullable (since Supabase Auth handles passwords)
ALTER TABLE member_accounts 
ALTER COLUMN password_hash DROP NOT NULL;

-- 2. Update existing records to use auth-managed indicator
UPDATE member_accounts 
SET password_hash = 'managed_by_supabase_auth' 
WHERE password_hash IS NULL 
   OR password_hash = '' 
   OR password_hash = 'handled_by_auth';

-- 3. Verify the fix
SELECT 
    ma.id,
    ma.email,
    ma.password_hash,
    ma.is_active,
    c.name as client_name
FROM member_accounts ma
LEFT JOIN clients c ON c.id = ma.client_id
ORDER BY ma.created_at DESC;
