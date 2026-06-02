-- Demo patient: Бауыржан Омаров
DO $$
DECLARE
    uid UUID := 'd0000000-0000-0000-0000-000000000001';
BEGIN
    INSERT INTO users (id, email, password_hash, full_name, role, status, created_at, updated_at)
    VALUES (uid,
            'baurzhan@demo.com',
            crypt('Patient123!', gen_salt('bf', 12)),
            'Бауыржан Омаров',
            'PATIENT', 'ACTIVE', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO patients (id, birth_date, gender, phone)
    VALUES (uid, '1995-03-15', 'MALE', '+7 (705) 999-88-77')
    ON CONFLICT (id) DO NOTHING;
END $$;
