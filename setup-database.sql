-- ============================================================================
-- FITCLIENT DATABASE SETUP SCRIPT
-- ============================================================================
-- 
-- This script should be run in the Supabase SQL Editor to set up the complete
-- database structure for the FitClient fitness SaaS application.
--
-- Instructions:
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to SQL Editor
-- 3. Paste this entire script
-- 4. Click "Run" to execute
--
-- WARNING: This script will DROP all existing tables and recreate them.
-- Make sure you have backed up any important data before running.
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- DROP EXISTING TABLES (if they exist)
-- ============================================================================

-- Drop tables in reverse dependency order to avoid foreign key constraints
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS packages CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS trainers CASCADE;

-- ============================================================================
-- CREATE TABLES
-- ============================================================================

-- Create trainers table
-- This table stores trainer profiles and links to Supabase auth.users
CREATE TABLE trainers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create clients table
-- This table stores client information linked to trainers
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    qr_code VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create packages table
-- This table stores training packages offered by trainers
CREATE TABLE packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    session_count INTEGER NOT NULL CHECK (session_count > 0),
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create purchases table
-- This table tracks client package purchases
CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    remaining_sessions INTEGER NOT NULL CHECK (remaining_sessions >= 0),
    purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sessions table
-- This table tracks client check-ins and sessions
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
    check_in_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Trainers indexes
CREATE INDEX idx_trainers_user_id ON trainers(user_id);
CREATE INDEX idx_trainers_email ON trainers(email);

-- Clients indexes
CREATE INDEX idx_clients_trainer_id ON clients(trainer_id);
CREATE INDEX idx_clients_qr_code ON clients(qr_code);
CREATE INDEX idx_clients_email ON clients(email);

-- Packages indexes
CREATE INDEX idx_packages_trainer_id ON packages(trainer_id);
CREATE INDEX idx_packages_active ON packages(is_active);

-- Purchases indexes
CREATE INDEX idx_purchases_client_id ON purchases(client_id);
CREATE INDEX idx_purchases_package_id ON purchases(package_id);
CREATE INDEX idx_purchases_date ON purchases(purchase_date);

-- Sessions indexes
CREATE INDEX idx_sessions_client_id ON sessions(client_id);
CREATE INDEX idx_sessions_trainer_id ON sessions(trainer_id);
CREATE INDEX idx_sessions_check_in_time ON sessions(check_in_time);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE DEVELOPMENT POLICIES (ALLOW ALL OPERATIONS)
-- ============================================================================
-- 
-- WARNING: These policies allow all operations for development purposes.
-- In production, you should replace these with proper RLS policies that
-- restrict access based on user roles and ownership.

-- Trainers policies
CREATE POLICY "Allow all operations on trainers (DEV)" ON trainers
    FOR ALL USING (true) WITH CHECK (true);

-- Clients policies
CREATE POLICY "Allow all operations on clients (DEV)" ON clients
    FOR ALL USING (true) WITH CHECK (true);

-- Packages policies
CREATE POLICY "Allow all operations on packages (DEV)" ON packages
    FOR ALL USING (true) WITH CHECK (true);

-- Purchases policies
CREATE POLICY "Allow all operations on purchases (DEV)" ON purchases
    FOR ALL USING (true) WITH CHECK (true);

-- Sessions policies
CREATE POLICY "Allow all operations on sessions (DEV)" ON sessions
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- CREATE TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Function to automatically update remaining_sessions when a session is created
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
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update remaining_sessions
CREATE TRIGGER session_check_in_trigger
    AFTER INSERT ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_remaining_sessions();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_trainers_updated_at BEFORE UPDATE ON trainers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON packages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- CREATE VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Client summary view with remaining sessions and attendance
CREATE VIEW client_summary AS
SELECT 
    c.id as client_id,
    c.name as client_name,
    c.email as client_email,
    c.phone as client_phone,
    c.qr_code,
    t.name as trainer_name,
    COALESCE(SUM(p.remaining_sessions), 0) as total_remaining_sessions,
    COUNT(s.id) as total_sessions_attended,
    c.created_at as client_since
FROM clients c
JOIN trainers t ON c.trainer_id = t.id
LEFT JOIN purchases p ON c.id = p.client_id
LEFT JOIN sessions s ON c.id = s.client_id
GROUP BY c.id, c.name, c.email, c.phone, c.qr_code, t.name, c.created_at;

-- Trainer dashboard stats view
CREATE VIEW trainer_stats AS
SELECT 
    t.id as trainer_id,
    t.name as trainer_name,
    COUNT(DISTINCT c.id) as total_clients,
    COUNT(DISTINCT pkg.id) as total_packages,
    COUNT(DISTINCT s.id) as total_sessions,
    COALESCE(SUM(p.remaining_sessions), 0) as total_remaining_sessions,
    COUNT(DISTINCT DATE(s.check_in_time)) as active_days
FROM trainers t
LEFT JOIN clients c ON t.id = c.trainer_id
LEFT JOIN packages pkg ON t.id = pkg.trainer_id
LEFT JOIN sessions s ON t.id = s.trainer_id
LEFT JOIN purchases p ON c.id = p.client_id
GROUP BY t.id, t.name;

-- ============================================================================
-- INSERT SAMPLE DATA (OPTIONAL - FOR DEVELOPMENT)
-- ============================================================================

-- Uncomment the following section if you want to insert sample data for testing

/*
-- Insert sample trainer (replace with actual user_id from auth.users)
INSERT INTO trainers (user_id, email, name) VALUES 
('your-user-id-here', 'trainer@fitclient.com', 'John Trainer');

-- Insert sample client
INSERT INTO clients (trainer_id, name, email, phone, qr_code) VALUES 
((SELECT id FROM trainers LIMIT 1), 'Alice Client', 'alice@example.com', '+1234567890', 'CLIENT_001');

-- Insert sample package
INSERT INTO packages (trainer_id, name, session_count, price) VALUES 
((SELECT id FROM trainers LIMIT 1), 'Basic Package', 10, 99.99);

-- Insert sample purchase
INSERT INTO purchases (client_id, package_id, remaining_sessions) VALUES 
((SELECT id FROM clients LIMIT 1), (SELECT id FROM packages LIMIT 1), 10);
*/

-- ============================================================================
-- SCRIPT COMPLETION MESSAGE
-- ============================================================================

-- Display completion message
DO $$
BEGIN
    RAISE NOTICE 'FitClient database setup completed successfully!';
    RAISE NOTICE 'Tables created: trainers, clients, packages, purchases, sessions';
    RAISE NOTICE 'Views created: client_summary, trainer_stats';
    RAISE NOTICE 'RLS enabled on all tables with development policies';
    RAISE NOTICE 'Remember to replace development policies with production policies before going live!';
END $$; 