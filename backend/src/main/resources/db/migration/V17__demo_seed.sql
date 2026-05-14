-- Demo accounts for defense presentation
-- Credentials: demo@patient.com / Demo1234! | demo@doctor.com / Demo1234! | admin@medai.kz / Admin1234!
-- Password hash below is bcrypt of 'Demo1234!'

-- Demo patient
INSERT INTO users (id, email, password_hash, full_name, role, status, created_at, updated_at)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'demo@patient.com',
  '$2y$12$Zs6gg22kyvxkMdr0KaLtNO.kvJeyVNEBPYoHpVeHrJM3tUn3J1VNC',
  'Аяулым Бекова',
  'PATIENT', 'ACTIVE', NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO patients (id, birth_date, gender, phone)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  '1995-03-22', 'FEMALE', '+7 (701) 234-56-78'
) ON CONFLICT (id) DO NOTHING;

-- Demo doctor (cardiology)
INSERT INTO users (id, email, password_hash, full_name, role, status, created_at, updated_at)
VALUES (
  'b0000000-0000-0000-0000-000000000002',
  'demo@doctor.com',
  '$2y$12$Zs6gg22kyvxkMdr0KaLtNO.kvJeyVNEBPYoHpVeHrJM3tUn3J1VNC',
  'Нурлан Демо',
  'DOCTOR', 'ACTIVE', NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO doctors (id, specialization_id, license_number, years_experience, bio, consultation_fee, verified, average_rating)
SELECT
  'b0000000-0000-0000-0000-000000000002',
  id,
  'KZ-DEMO-CARDIO-001',
  8,
  'Врач-кардиолог с 8-летним опытом. Специализируется на диагностике и лечении ишемической болезни сердца, аритмий, гипертонической болезни. Активно использует AI-систему для предварительной оценки симптомов.',
  9000,
  true,
  4.8
FROM specializations WHERE code = 'cardiology'
ON CONFLICT (id) DO NOTHING;

-- Generate time slots for demo doctor (next 14 workdays)
DO $$
DECLARE
    day_offset INT;
    target_date DATE;
    hour_val INT;
    slot_start TIMESTAMPTZ;
    slot_end TIMESTAMPTZ;
BEGIN
    FOR day_offset IN 0..20 LOOP
        target_date := CURRENT_DATE + day_offset;
        IF EXTRACT(DOW FROM target_date) IN (0, 6) THEN
            CONTINUE;
        END IF;
        FOR hour_val IN 8..19 LOOP
            IF hour_val = 13 THEN CONTINUE; END IF;
            slot_start := (target_date + (hour_val || ' hours')::INTERVAL) AT TIME ZONE 'UTC';
            slot_end   := slot_start + INTERVAL '1 hour';
            INSERT INTO time_slots (id, doctor_id, start_time, end_time, is_booked)
            VALUES (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000002', slot_start, slot_end, FALSE)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

-- Create 2 completed demo appointments (past dates) for demo patient with demo doctor
DO $$
DECLARE
    slot1_id UUID;
    slot2_id UUID;
    appt1_id UUID := gen_random_uuid();
    appt2_id UUID := gen_random_uuid();
    past_slot1 TIMESTAMPTZ := (CURRENT_DATE - 14 + INTERVAL '10 hours') AT TIME ZONE 'UTC';
    past_slot2 TIMESTAMPTZ := (CURRENT_DATE - 7  + INTERVAL '14 hours') AT TIME ZONE 'UTC';
BEGIN
    -- Past slot 1
    slot1_id := gen_random_uuid();
    INSERT INTO time_slots (id, doctor_id, start_time, end_time, is_booked)
    VALUES (slot1_id, 'b0000000-0000-0000-0000-000000000002', past_slot1, past_slot1 + INTERVAL '1 hour', TRUE)
    ON CONFLICT DO NOTHING;

    INSERT INTO appointments (id, patient_id, doctor_id, time_slot_id, status, type, complaint, created_at, updated_at)
    VALUES (appt1_id, 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002',
            slot1_id, 'COMPLETED', 'OFFLINE',
            'Боль в грудной клетке при физической нагрузке, одышка', NOW(), NOW())
    ON CONFLICT DO NOTHING;

    -- Review for appt1
    INSERT INTO doctor_reviews (id, doctor_id, patient_id, appointment_id, rating, comment, created_at)
    VALUES (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001',
            appt1_id, 5, 'Отличный врач! Очень внимательный, всё объяснил, назначил грамотное лечение. Чувствую себя значительно лучше.', NOW())
    ON CONFLICT DO NOTHING;

    -- Past slot 2
    slot2_id := gen_random_uuid();
    INSERT INTO time_slots (id, doctor_id, start_time, end_time, is_booked)
    VALUES (slot2_id, 'b0000000-0000-0000-0000-000000000002', past_slot2, past_slot2 + INTERVAL '1 hour', TRUE)
    ON CONFLICT DO NOTHING;

    INSERT INTO appointments (id, patient_id, doctor_id, time_slot_id, status, type, complaint, created_at, updated_at)
    VALUES (appt2_id, 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002',
            slot2_id, 'COMPLETED', 'ONLINE',
            'Плановое наблюдение, контроль давления после курса лечения', NOW(), NOW())
    ON CONFLICT DO NOTHING;
END $$;

-- Create 1 upcoming appointment for demo patient
DO $$
DECLARE
    upcoming_slot_id UUID;
    upcoming_start TIMESTAMPTZ := (CURRENT_DATE + 3 + INTERVAL '11 hours') AT TIME ZONE 'UTC';
BEGIN
    -- Find or create upcoming slot
    SELECT id INTO upcoming_slot_id
    FROM time_slots
    WHERE doctor_id = 'b0000000-0000-0000-0000-000000000002'
      AND start_time >= upcoming_start
      AND start_time < upcoming_start + INTERVAL '2 hours'
      AND NOT is_booked
    LIMIT 1;

    IF upcoming_slot_id IS NULL THEN
        upcoming_slot_id := gen_random_uuid();
        INSERT INTO time_slots (id, doctor_id, start_time, end_time, is_booked)
        VALUES (upcoming_slot_id, 'b0000000-0000-0000-0000-000000000002', upcoming_start, upcoming_start + INTERVAL '1 hour', TRUE)
        ON CONFLICT DO NOTHING;
    ELSE
        UPDATE time_slots SET is_booked = TRUE WHERE id = upcoming_slot_id;
    END IF;

    INSERT INTO appointments (id, patient_id, doctor_id, time_slot_id, status, type, complaint, created_at, updated_at)
    VALUES (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002',
            upcoming_slot_id, 'SCHEDULED', 'ONLINE',
            'Плановый осмотр, обсуждение результатов анализов', NOW(), NOW())
    ON CONFLICT DO NOTHING;
END $$;

-- Mark ~35% of existing slots as booked for realism (demo doctors get busy-looking schedule)
DO $$
DECLARE
    slot_rec RECORD;
    counter INT := 0;
BEGIN
    FOR slot_rec IN
        SELECT id FROM time_slots
        WHERE NOT is_booked
          AND start_time > NOW() - INTERVAL '30 days'
          AND start_time < NOW() + INTERVAL '14 days'
        ORDER BY random()
        LIMIT (SELECT COUNT(*) * 35 / 100 FROM time_slots WHERE NOT is_booked AND start_time > NOW() - INTERVAL '30 days')
    LOOP
        UPDATE time_slots SET is_booked = TRUE WHERE id = slot_rec.id;
        counter := counter + 1;
    END LOOP;
END $$;

-- Update demo doctor average rating based on review
UPDATE doctors
SET average_rating = (
    SELECT COALESCE(AVG(rating), 0)
    FROM doctor_reviews
    WHERE doctor_id = 'b0000000-0000-0000-0000-000000000002'
)
WHERE id = 'b0000000-0000-0000-0000-000000000002';
