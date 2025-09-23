-- Check Available Clients for Member Account Creation
-- Run this before creating test member accounts

-- =====================================================
-- CHECK EXISTING CLIENTS
-- =====================================================

-- Show all clients (for trainer reference)
SELECT 
  id,
  name,
  email,
  phone,
  created_at
FROM clients
ORDER BY created_at DESC;

-- =====================================================
-- CHECK CLIENTS WITHOUT MEMBER ACCOUNTS
-- =====================================================

-- Show clients that don't have member accounts yet
SELECT 
  c.id,
  c.name,
  c.email,
  c.phone,
  c.created_at,
  'No member account' as status
FROM clients c
LEFT JOIN member_accounts ma ON ma.client_id = c.id
WHERE ma.client_id IS NULL
ORDER BY c.created_at DESC;

-- =====================================================
-- CHECK CLIENTS WITH EXISTING MEMBER ACCOUNTS
-- =====================================================

-- Show clients that already have member accounts
SELECT 
  c.id,
  c.name,
  c.email,
  c.phone,
  ma.email as member_email,
  ma.is_active,
  ma.created_at as account_created
FROM clients c
JOIN member_accounts ma ON ma.client_id = c.id
ORDER BY ma.created_at DESC;

-- =====================================================
-- SUMMARY COUNTS
-- =====================================================

SELECT 
  'Total clients' as metric,
  COUNT(*) as count
FROM clients

UNION ALL

SELECT 
  'Clients with member accounts' as metric,
  COUNT(DISTINCT client_id) as count
FROM member_accounts

UNION ALL

SELECT 
  'Clients without member accounts' as metric,
  COUNT(*) as count
FROM clients c
LEFT JOIN member_accounts ma ON ma.client_id = c.id
WHERE ma.client_id IS NULL;

-- =====================================================
-- RECOMMENDED CLIENT FOR TEST
-- =====================================================

-- Get the first client without a member account (recommended for test)
SELECT 
  c.id,
  c.name,
  c.email,
  c.phone
FROM clients c
LEFT JOIN member_accounts ma ON ma.client_id = c.id
WHERE ma.client_id IS NULL
ORDER BY c.created_at DESC
LIMIT 1;
