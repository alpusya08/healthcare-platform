-- Admin user: admin@healthcare.kz / Admin1234!
-- Password hash: BCrypt of 'Admin1234!'
INSERT INTO users (id, email, password_hash, full_name, role, status, created_at, updated_at)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'admin@healthcare.kz',
    '$2a$12$f1JuHhdQGw1RuGOypJuXeeX2g9gRxJnna/7b3h4o.rfKftG8odWJe',
    'Администратор',
    'ADMIN',
    'ACTIVE',
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;
