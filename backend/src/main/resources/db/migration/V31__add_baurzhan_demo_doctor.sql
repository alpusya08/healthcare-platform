-- Remove wrong V30 patient record for Бауыржан Омаров
DO $$
DECLARE
    wrong_uid UUID := 'd0000000-0000-0000-0000-000000000001';
    doc_uid   UUID := 'a1b2c3d4-0002-0002-0002-000000000002';
BEGIN
    -- Clean up incorrect V30 patient record
    DELETE FROM patients WHERE id = wrong_uid;
    DELETE FROM users    WHERE id = wrong_uid;

    -- Create Бауыржан Омаров as DOCTOR
    INSERT INTO users (id, email, password_hash, full_name, role, status, created_at, updated_at)
    VALUES (doc_uid,
            'baurzhan@demo.com',
            crypt('Doctor123!', gen_salt('bf', 12)),
            'Бауыржан Омаров',
            'DOCTOR', 'ACTIVE', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO doctors (
        id, specialization_id, years_experience, bio,
        consultation_fee, average_rating, verified, license_number,
        photo_url, created_at, updated_at
    )
    SELECT
        doc_uid,
        s.id,
        8,
        'Опытный терапевт с широкой практикой в области диагностики и лечения внутренних болезней. Принимает как онлайн, так и офлайн.',
        7500,
        0,
        true,
        'KZ-2016-TH-00421',
        NULL,
        NOW(),
        NOW()
    FROM specializations s WHERE s.code = 'THERAPY'
    ON CONFLICT (id) DO NOTHING;
END $$;
