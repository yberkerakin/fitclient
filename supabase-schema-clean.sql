CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE trainers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    qr_code VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    session_count INTEGER NOT NULL CHECK (session_count > 0),
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    remaining_sessions INTEGER NOT NULL CHECK (remaining_sessions >= 0),
    purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
    check_in_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_clients_trainer_id ON clients(trainer_id);
CREATE INDEX idx_clients_qr_code ON clients(qr_code);
CREATE INDEX idx_packages_trainer_id ON packages(trainer_id);
CREATE INDEX idx_purchases_client_id ON purchases(client_id);
CREATE INDEX idx_purchases_package_id ON purchases(package_id);
CREATE INDEX idx_sessions_client_id ON sessions(client_id);
CREATE INDEX idx_sessions_trainer_id ON sessions(trainer_id);
CREATE INDEX idx_sessions_check_in_time ON sessions(check_in_time);

ALTER TABLE trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can view their own data" ON trainers
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Trainers can update their own data" ON trainers
    FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "Trainers can view their clients" ON clients
    FOR SELECT USING (
        trainer_id IN (
            SELECT id FROM trainers WHERE auth.uid()::text = id::text
        )
    );

CREATE POLICY "Trainers can manage their clients" ON clients
    FOR ALL USING (
        trainer_id IN (
            SELECT id FROM trainers WHERE auth.uid()::text = id::text
        )
    );

CREATE POLICY "Trainers can view their packages" ON packages
    FOR SELECT USING (
        trainer_id IN (
            SELECT id FROM trainers WHERE auth.uid()::text = id::text
        )
    );

CREATE POLICY "Trainers can manage their packages" ON packages
    FOR ALL USING (
        trainer_id IN (
            SELECT id FROM trainers WHERE auth.uid()::text = id::text
        )
    );

CREATE POLICY "Trainers can view purchases for their clients" ON purchases
    FOR SELECT USING (
        client_id IN (
            SELECT c.id FROM clients c 
            JOIN trainers t ON c.trainer_id = t.id 
            WHERE t.id::text = auth.uid()::text
        )
    );

CREATE POLICY "Trainers can manage purchases for their clients" ON purchases
    FOR ALL USING (
        client_id IN (
            SELECT c.id FROM clients c 
            JOIN trainers t ON c.trainer_id = t.id 
            WHERE t.id::text = auth.uid()::text
        )
    );

CREATE POLICY "Trainers can view their sessions" ON sessions
    FOR SELECT USING (
        trainer_id IN (
            SELECT id FROM trainers WHERE auth.uid()::text = id::text
        )
    );

CREATE POLICY "Trainers can manage their sessions" ON sessions
    FOR ALL USING (
        trainer_id IN (
            SELECT id FROM trainers WHERE auth.uid()::text = id::text
        )
    );

CREATE OR REPLACE FUNCTION update_remaining_sessions()
RETURNS TRIGGER AS $$
BEGIN
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

CREATE TRIGGER session_check_in_trigger
    AFTER INSERT ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_remaining_sessions();

CREATE VIEW client_summary AS
SELECT 
    c.id as client_id,
    c.name as client_name,
    c.email as client_email,
    c.phone as client_phone,
    t.name as trainer_name,
    COALESCE(SUM(p.remaining_sessions), 0) as total_remaining_sessions,
    COUNT(s.id) as total_sessions_attended
FROM clients c
JOIN trainers t ON c.trainer_id = t.id
LEFT JOIN purchases p ON c.id = p.client_id
LEFT JOIN sessions s ON c.id = s.client_id
GROUP BY c.id, c.name, c.email, c.phone, t.name; 