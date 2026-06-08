-- Reset all user passwords to Astana@025
UPDATE users
SET password_hash = crypt('Astana@025', gen_salt('bf', 12)),
    updated_at    = NOW();
