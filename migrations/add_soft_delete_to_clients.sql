-- Add soft delete functionality to clients table
-- Migration: add_soft_delete_to_clients.sql

-- Add deleted_at column to clients table (if it doesn't exist)
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for better performance when filtering deleted clients
CREATE INDEX IF NOT EXISTS idx_clients_deleted_at ON clients(deleted_at);

-- Update the client_summary view to exclude deleted clients
DROP VIEW IF EXISTS client_summary;
CREATE VIEW client_summary AS
SELECT 
    c.id,
    c.trainer_id,
    c.name,
    c.phone,
    c.email,
    c.remaining_sessions,
    c.created_at,
    c.updated_at,
    c.deleted_at,
    COUNT(p.id) as total_purchases,
    COUNT(s.id) as total_sessions
FROM clients c
LEFT JOIN purchases p ON c.id = p.client_id
LEFT JOIN sessions s ON c.id = s.client_id
WHERE c.deleted_at IS NULL  -- Only include non-deleted clients
GROUP BY c.id, c.trainer_id, c.name, c.phone, c.email, c.remaining_sessions, c.created_at, c.updated_at, c.deleted_at;

-- Update RLS policies to exclude deleted clients
DROP POLICY IF EXISTS "Trainers can view their own clients" ON clients;
CREATE POLICY "Trainers can view their own clients" ON clients
    FOR SELECT USING (
        trainer_id IN (
            SELECT id FROM trainers WHERE user_id = auth.uid()
        ) 
        AND deleted_at IS NULL  -- Only show non-deleted clients
    );

DROP POLICY IF EXISTS "Trainers can insert their own clients" ON clients;
CREATE POLICY "Trainers can insert their own clients" ON clients
    FOR INSERT WITH CHECK (
        trainer_id IN (
            SELECT id FROM trainers WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Trainers can update their own clients" ON clients;
CREATE POLICY "Trainers can update their own clients" ON clients
    FOR UPDATE USING (
        trainer_id IN (
            SELECT id FROM trainers WHERE user_id = auth.uid()
        )
        AND deleted_at IS NULL  -- Only allow updates to non-deleted clients
    );

-- Add policy for soft delete (setting deleted_at)
DROP POLICY IF EXISTS "Trainers can soft delete their own clients" ON clients;
CREATE POLICY "Trainers can soft delete their own clients" ON clients
    FOR UPDATE USING (
        trainer_id IN (
            SELECT id FROM trainers WHERE user_id = auth.uid()
        )
    ) WITH CHECK (
        trainer_id IN (
            SELECT id FROM trainers WHERE user_id = auth.uid()
        )
    );

-- Update the function to get clients by trainer to exclude deleted clients
CREATE OR REPLACE FUNCTION get_clients_by_trainer(trainer_id_param UUID)
RETURNS TABLE (
    id UUID,
    trainer_id UUID,
    name TEXT,
    phone TEXT,
    email TEXT,
    qr_code TEXT,
    remaining_sessions INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.trainer_id,
        c.name,
        c.phone,
        c.email,
        c.qr_code,
        c.remaining_sessions,
        c.created_at,
        c.updated_at,
        c.deleted_at
    FROM clients c
    WHERE c.trainer_id = trainer_id_param
    AND c.deleted_at IS NULL  -- Only return non-deleted clients
    ORDER BY c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment to explain the soft delete functionality
COMMENT ON COLUMN clients.deleted_at IS 'Soft delete timestamp. NULL means active, non-NULL means deleted.'; 