-- Simple Test Member Account Creation
-- Execute after manually creating auth user in Supabase Dashboard

-- 1. First create auth user manually:
-- Supabase Dashboard → Authentication → Users → Create User
-- Email: test@example.com, Password: test123

-- 2. Then run this SQL:
INSERT INTO member_accounts (client_id, email, password_hash, is_active)
SELECT 
  id,
  'test@example.com',
  'managed_by_supabase_auth',
  true
FROM clients
LIMIT 1;

-- 3. Verify it worked:
SELECT ma.*, c.name 
FROM member_accounts ma
JOIN clients c ON c.id = ma.client_id
WHERE ma.email = 'test@example.com';
