-- Admin user: admin@medai.kz / Admin1234!
-- Update password if admin exists by fixed UUID, insert if not
UPDATE users
SET password_hash = '$2a$12$h38s5ryKdxJZkv1BT2RPlOazOYnSAEP4bBSAN.X0ugCWGakyZ44V6',
    role          = 'ADMIN',
    status        = 'ACTIVE',
    updated_at    = NOW()
WHERE id = 'a0000000-0000-0000-0000-000000000001';

INSERT INTO users (id, email, password_hash, full_name, role, status, created_at, updated_at)
SELECT 'a0000000-0000-0000-0000-000000000001',
       'admin@medai.kz',
       '$2a$12$h38s5ryKdxJZkv1BT2RPlOazOYnSAEP4bBSAN.X0ugCWGakyZ44V6',
       'Администратор',
       'ADMIN',
       'ACTIVE',
       NOW(),
       NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 'a0000000-0000-0000-0000-000000000001');
