-- ============================================================================
-- MIGRATION: Add remaining_sessions field to clients table (FIXED)
-- ============================================================================
-- 
-- This migration adds a remaining_sessions field to the clients table
-- and updates the logic to properly track sessions.
--
-- Run this in Supabase SQL Editor after the initial setup.
-- ============================================================================

-- Add remaining_sessions column to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS remaining_sessions INTEGER DEFAULT 0;

-- Update existing clients with calculated remaining sessions from purchases
UPDATE clients 
SET remaining_sessions = COALESCE(
    (SELECT SUM(remaining_sessions) 
     FROM purchases 
     WHERE client_id = clients.id), 
    0
);

-- Create or replace function to update client remaining sessions when purchase is made
CREATE OR REPLACE FUNCTION update_client_remaining_sessions()
RETURNS TRIGGER AS $$
BEGIN
    -- Update client's total remaining sessions when a purchase is made
    IF TG_OP = 'DELETE' THEN
        -- For DELETE operations, use OLD.client_id
        UPDATE clients 
        SET remaining_sessions = (
            SELECT COALESCE(SUM(remaining_sessions), 0)
            FROM purchases 
            WHERE client_id = OLD.client_id
        )
        WHERE id = OLD.client_id;
        RETURN OLD;
    ELSE
        -- For INSERT and UPDATE operations, use NEW.client_id
        UPDATE clients 
        SET remaining_sessions = (
            SELECT COALESCE(SUM(remaining_sessions), 0)
            FROM purchases 
            WHERE client_id = NEW.client_id
        )
        WHERE id = NEW.client_id;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update client remaining sessions on purchase
DROP TRIGGER IF EXISTS update_client_sessions_on_purchase ON purchases;
CREATE TRIGGER update_client_sessions_on_purchase
    AFTER INSERT OR UPDATE OR DELETE ON purchases
    FOR EACH ROW
    EXECUTE FUNCTION update_client_remaining_sessions();

-- Update the existing update_remaining_sessions function to also update clients table
CREATE OR REPLACE FUNCTION update_remaining_sessions()
RETURNS TRIGGER AS $$
BEGIN
    -- Decrease remaining_sessions by 1 for the most recent purchase
    UPDATE purchases 
    SET remaining_sessions = remaining_sessions - 1
    WHERE id = (
        SELECT id FROM purchases 
        WHERE client_id = NEW.client_id 
        AND remaining_sessions > 0
        ORDER BY purchase_date DESC
        LIMIT 1
    );
    
    -- Update client's total remaining sessions
    UPDATE clients 
    SET remaining_sessions = (
        SELECT COALESCE(SUM(remaining_sessions), 0)
        FROM purchases 
        WHERE client_id = NEW.client_id
    )
    WHERE id = NEW.client_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add index for better performance on remaining_sessions queries
CREATE INDEX IF NOT EXISTS idx_clients_remaining_sessions ON clients(remaining_sessions);

-- Drop the existing client_summary view to avoid data type conflicts
DROP VIEW IF EXISTS client_summary;

-- Recreate client_summary view to use the new remaining_sessions field
CREATE VIEW client_summary AS
SELECT 
    c.id as client_id,
    c.name as client_name,
    c.email as client_email,
    c.phone as client_phone,
    c.qr_code,
    t.name as trainer_name,
    c.remaining_sessions as total_remaining_sessions,
    COUNT(s.id) as total_sessions_attended,
    c.created_at as client_since
FROM clients c
JOIN trainers t ON c.trainer_id = t.id
LEFT JOIN sessions s ON c.id = s.client_id
GROUP BY c.id, c.name, c.email, c.phone, c.qr_code, t.name, c.remaining_sessions, c.created_at;

-- Add comment to document the migration
COMMENT ON COLUMN clients.remaining_sessions IS 'Total remaining sessions for this client, calculated from purchases and updated by triggers'; 