-- Demo-ready data for committee presentation
-- Resets demo@patient.com history and adds fresh upcoming + completed appointments
-- Demo credentials:
--   Patient : demo@patient.com   / Demo1234!
--   Doctor  : demo@doctor.com    / Demo1234!
--   Admin   : admin@medai.kz     / Admin1234!

DO $$
DECLARE
    v_patient_id   UUID := 'b0000000-0000-0000-0000-000000000001';
    v_doctor_id    UUID := 'b0000000-0000-0000-0000-000000000002';
    v_ts_id        UUID;
    v_appt_id      UUID;
    v_slot_start   TIMESTAMPTZ;
BEGIN

    -- ── 1. Wipe old stale data for this patient ──────────────────────────────
    DELETE FROM doctor_reviews  WHERE patient_id = v_patient_id;
    DELETE FROM appointments    WHERE patient_id = v_patient_id;
    DELETE FROM time_slots
        WHERE doctor_id = v_doctor_id
          AND id NOT IN (
              SELECT time_slot_id FROM appointments WHERE time_slot_id IS NOT NULL
          );

    -- ── 2. Completed appointment #1 — 21 days ago, with review ──────────────
    v_ts_id   := gen_random_uuid();
    v_appt_id := gen_random_uuid();
    INSERT INTO time_slots (id, doctor_id, start_time, end_time, is_booked, appointment_type)
    VALUES (v_ts_id, v_doctor_id,
            NOW() - INTERVAL '21 days' + INTERVAL '10 hours',
            NOW() - INTERVAL '21 days' + INTERVAL '10 hours 30 minutes',
            true, 'OFFLINE')
    ON CONFLICT DO NOTHING;
    INSERT INTO appointments (id, patient_id, doctor_id, time_slot_id, status, type, complaint,
                              payment_status, payment_amount, created_at, updated_at)
    VALUES (v_appt_id, v_patient_id, v_doctor_id, v_ts_id, 'COMPLETED', 'OFFLINE',
            'Периодические боли в груди, одышка при физической нагрузке',
            'PAID', 9000, NOW() - INTERVAL '21 days', NOW() - INTERVAL '21 days')
    ON CONFLICT DO NOTHING;
    INSERT INTO doctor_reviews (id, appointment_id, doctor_id, patient_id, rating, comment, is_anonymous, created_at)
    VALUES (gen_random_uuid(), v_appt_id, v_doctor_id, v_patient_id, 5,
            'Отличный врач, очень внимательный и профессиональный. Подробно объяснил результаты и назначил лечение.',
            false, NOW() - INTERVAL '20 days')
    ON CONFLICT DO NOTHING;

    -- ── 3. Completed appointment #2 — 7 days ago, NO review (demo: leave one) ─
    v_ts_id   := gen_random_uuid();
    v_appt_id := gen_random_uuid();
    INSERT INTO time_slots (id, doctor_id, start_time, end_time, is_booked, appointment_type)
    VALUES (v_ts_id, v_doctor_id,
            NOW() - INTERVAL '7 days' + INTERVAL '14 hours',
            NOW() - INTERVAL '7 days' + INTERVAL '14 hours 30 minutes',
            true, 'ONLINE')
    ON CONFLICT DO NOTHING;
    INSERT INTO appointments (id, patient_id, doctor_id, time_slot_id, status, type, complaint,
                              payment_status, payment_amount, created_at, updated_at)
    VALUES (v_appt_id, v_patient_id, v_doctor_id, v_ts_id, 'COMPLETED', 'ONLINE',
            'Контрольный осмотр после лечения, динамика положительная',
            'PAID', 9000, NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days')
    ON CONFLICT DO NOTHING;

    -- ── 4. Cancelled appointment — 3 days ago ────────────────────────────────
    v_ts_id := gen_random_uuid();
    INSERT INTO time_slots (id, doctor_id, start_time, end_time, is_booked, appointment_type)
    VALUES (v_ts_id, v_doctor_id,
            NOW() - INTERVAL '3 days' + INTERVAL '9 hours',
            NOW() - INTERVAL '3 days' + INTERVAL '9 hours 30 minutes',
            false, 'OFFLINE')
    ON CONFLICT DO NOTHING;
    INSERT INTO appointments (id, patient_id, doctor_id, time_slot_id, status, type, complaint,
                              payment_status, payment_amount, created_at, updated_at)
    VALUES (gen_random_uuid(), v_patient_id, v_doctor_id, v_ts_id, 'CANCELLED', 'OFFLINE',
            'Головные боли по утрам',
            'REFUNDED', 9000, NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days')
    ON CONFLICT DO NOTHING;

    -- ── 5. Upcoming appointment — tomorrow 11:00 (pre-booked for the demo) ───
    v_slot_start := date_trunc('day', NOW() + INTERVAL '1 day') + INTERVAL '11 hours';
    v_ts_id   := gen_random_uuid();
    v_appt_id := gen_random_uuid();
    INSERT INTO time_slots (id, doctor_id, start_time, end_time, is_booked, appointment_type)
    VALUES (v_ts_id, v_doctor_id, v_slot_start, v_slot_start + INTERVAL '30 minutes', true, 'OFFLINE')
    ON CONFLICT DO NOTHING;
    INSERT INTO appointments (id, patient_id, doctor_id, time_slot_id, status, type, complaint,
                              payment_status, payment_amount, created_at, updated_at)
    VALUES (v_appt_id, v_patient_id, v_doctor_id, v_ts_id, 'SCHEDULED', 'OFFLINE',
            'Плановый осмотр — наблюдение кардиолога',
            'PAID', 9000, NOW(), NOW())
    ON CONFLICT DO NOTHING;

    -- ── 6. Free slots for demo doctor — so live booking works during demo ─────
    -- Today: 3 free slots from 15:00
    INSERT INTO time_slots (doctor_id, start_time, end_time, is_booked, appointment_type)
    VALUES
        (v_doctor_id, date_trunc('day', NOW()) + INTERVAL '15 hours',
                      date_trunc('day', NOW()) + INTERVAL '15 hours 30 minutes', false, 'BOTH'),
        (v_doctor_id, date_trunc('day', NOW()) + INTERVAL '16 hours',
                      date_trunc('day', NOW()) + INTERVAL '16 hours 30 minutes', false, 'BOTH'),
        (v_doctor_id, date_trunc('day', NOW()) + INTERVAL '17 hours',
                      date_trunc('day', NOW()) + INTERVAL '17 hours 30 minutes', false, 'BOTH')
    ON CONFLICT DO NOTHING;

    -- Tomorrow: 4 free slots (besides the booked 11:00)
    INSERT INTO time_slots (doctor_id, start_time, end_time, is_booked, appointment_type)
    VALUES
        (v_doctor_id, v_slot_start - INTERVAL '2 hours',  v_slot_start - INTERVAL '1 hour 30 minutes',  false, 'BOTH'),
        (v_doctor_id, v_slot_start - INTERVAL '1 hour',   v_slot_start - INTERVAL '30 minutes',          false, 'BOTH'),
        (v_doctor_id, v_slot_start + INTERVAL '1 hour',   v_slot_start + INTERVAL '1 hour 30 minutes',   false, 'BOTH'),
        (v_doctor_id, v_slot_start + INTERVAL '2 hours',  v_slot_start + INTERVAL '2 hours 30 minutes',  false, 'BOTH')
    ON CONFLICT DO NOTHING;

    -- Day after tomorrow: 3 free slots
    INSERT INTO time_slots (doctor_id, start_time, end_time, is_booked, appointment_type)
    VALUES
        (v_doctor_id, date_trunc('day', NOW() + INTERVAL '2 days') + INTERVAL '10 hours',
                      date_trunc('day', NOW() + INTERVAL '2 days') + INTERVAL '10 hours 30 minutes', false, 'BOTH'),
        (v_doctor_id, date_trunc('day', NOW() + INTERVAL '2 days') + INTERVAL '13 hours',
                      date_trunc('day', NOW() + INTERVAL '2 days') + INTERVAL '13 hours 30 minutes', false, 'BOTH'),
        (v_doctor_id, date_trunc('day', NOW() + INTERVAL '2 days') + INTERVAL '15 hours',
                      date_trunc('day', NOW() + INTERVAL '2 days') + INTERVAL '15 hours 30 minutes', false, 'BOTH')
    ON CONFLICT DO NOTHING;

END $$;
