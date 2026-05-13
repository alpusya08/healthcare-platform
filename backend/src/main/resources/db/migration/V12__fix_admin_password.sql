-- Ensure admin password is correct (idempotent)
UPDATE users
SET password_hash = '$2a$12$h38s5ryKdxJZkv1BT2RPlOazOYnSAEP4bBSAN.X0ugCWGakyZ44V6',
    status        = 'ACTIVE',
    updated_at    = NOW()
WHERE id = 'a0000000-0000-0000-0000-000000000001';
