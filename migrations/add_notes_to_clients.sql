-- Add notes field to clients table
-- Migration: add_notes_to_clients.sql

-- Add notes column to clients table (if it doesn't exist)
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;

-- Add comment to explain the notes functionality
COMMENT ON COLUMN clients.notes IS 'Trainer notes about the client including special requirements, health conditions, etc.'; 