-- Rich demo data: extra patients, completed appointments with reviews, AI session links
-- Adds realistic history so the system looks live during demo

-- Extra demo patients
INSERT INTO users (id, email, password_hash, full_name, role, status, created_at, updated_at)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'aizat@demo.com',
   '$2y$12$Zs6gg22kyvxkMdr0KaLtNO.kvJeyVNEBPYoHpVeHrJM3tUn3J1VNC',
   'Айзат Нурланова', 'PATIENT', 'ACTIVE', NOW() - INTERVAL '60 days', NOW()),
  ('c1000000-0000-0000-0000-000000000002', 'daniyar@demo.com',
   '$2y$12$Zs6gg22kyvxkMdr0KaLtNO.kvJeyVNEBPYoHpVeHrJM3tUn3J1VNC',
   'Данияр Сейткали', 'PATIENT', 'ACTIVE', NOW() - INTERVAL '45 days', NOW()),
  ('c1000000-0000-0000-0000-000000000003', 'madina@demo.com',
   '$2y$12$Zs6gg22kyvxkMdr0KaLtNO.kvJeyVNEBPYoHpVeHrJM3tUn3J1VNC',
   'Мадина Ахметова', 'PATIENT', 'ACTIVE', NOW() - INTERVAL '30 days', NOW()),
  ('c1000000-0000-0000-0000-000000000004', 'arman@demo.com',
   '$2y$12$Zs6gg22kyvxkMdr0KaLtNO.kvJeyVNEBPYoHpVeHrJM3tUn3J1VNC',
   'Арман Жаксыбеков', 'PATIENT', 'ACTIVE', NOW() - INTERVAL '20 days', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO patients (id, birth_date, gender, phone) VALUES
  ('c1000000-0000-0000-0000-000000000001', '1992-07-15', 'FEMALE', '+7 (702) 111-22-33'),
  ('c1000000-0000-0000-0000-000000000002', '1988-02-28', 'MALE',   '+7 (707) 222-33-44'),
  ('c1000000-0000-0000-0000-000000000003', '2000-11-03', 'FEMALE', '+7 (708) 333-44-55'),
  ('c1000000-0000-0000-0000-000000000004', '1995-05-20', 'MALE',   '+7 (701) 444-55-66')
ON CONFLICT (id) DO NOTHING;

-- Completed appointments for demo@patient.com (Аяулым Бекова) with existing demo doctor
DO $$
DECLARE
    demo_patient UUID := 'b0000000-0000-0000-0000-000000000001';
    demo_doctor  UUID := 'b0000000-0000-0000-0000-000000000002';
    spec_id      UUID;
    slot_id      UUID;
    appt_id      UUID;
BEGIN
    SELECT id INTO spec_id FROM specializations WHERE code = 'cardiology' LIMIT 1;

    -- Appointment 1: 30 days ago, completed, with review
    slot_id := gen_random_uuid();
    appt_id := gen_random_uuid();
    INSERT INTO time_slots (id, doctor_id, start_time, end_time, is_booked, appointment_type)
    VALUES (slot_id, demo_doctor,
            NOW() - INTERVAL '30 days' + INTERVAL '10 hours',
            NOW() - INTERVAL '30 days' + INTERVAL '11 hours',
            true, 'OFFLINE') ON CONFLICT DO NOTHING;
    INSERT INTO appointments (id, patient_id, doctor_id, slot_id, status, type, complaint,
                              payment_status, payment_amount, created_at, updated_at)
    VALUES (appt_id, demo_patient, demo_doctor, slot_id, 'COMPLETED', 'OFFLINE',
            'Периодические боли в груди, одышка при нагрузке',
            'PAID', 9000, NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days')
    ON CONFLICT DO NOTHING;
    INSERT INTO doctor_reviews (id, appointment_id, doctor_id, patient_id, rating, comment, is_anonymous, created_at)
    VALUES (gen_random_uuid(), appt_id, demo_doctor, demo_patient, 5,
            'Отличный врач, очень внимательный. Подробно объяснил результаты анализов и назначил лечение.',
            false, NOW() - INTERVAL '29 days')
    ON CONFLICT DO NOTHING;

    -- Appointment 2: 15 days ago, completed, no review
    slot_id := gen_random_uuid();
    appt_id := gen_random_uuid();
    INSERT INTO time_slots (id, doctor_id, start_time, end_time, is_booked, appointment_type)
    VALUES (slot_id, demo_doctor,
            NOW() - INTERVAL '15 days' + INTERVAL '14 hours',
            NOW() - INTERVAL '15 days' + INTERVAL '15 hours',
            true, 'ONLINE') ON CONFLICT DO NOTHING;
    INSERT INTO appointments (id, patient_id, doctor_id, slot_id, status, type, complaint,
                              payment_status, payment_amount, created_at, updated_at)
    VALUES (appt_id, demo_patient, demo_doctor, slot_id, 'COMPLETED', 'ONLINE',
            'Контрольный осмотр после лечения',
            'PAID', 9000, NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days')
    ON CONFLICT DO NOTHING;

    -- Appointment 3: cancelled (demonstrates cancel flow)
    slot_id := gen_random_uuid();
    INSERT INTO time_slots (id, doctor_id, start_time, end_time, is_booked, appointment_type)
    VALUES (slot_id, demo_doctor,
            NOW() - INTERVAL '7 days' + INTERVAL '9 hours',
            NOW() - INTERVAL '7 days' + INTERVAL '10 hours',
            false, 'OFFLINE') ON CONFLICT DO NOTHING;
    INSERT INTO appointments (id, patient_id, doctor_id, slot_id, status, type, complaint,
                              payment_status, payment_amount, created_at, updated_at)
    VALUES (gen_random_uuid(), demo_patient, demo_doctor, slot_id, 'CANCELLED', 'OFFLINE',
            'Головные боли по утрам',
            'REFUNDED', 9000, NOW() - INTERVAL '8 days', NOW() - INTERVAL '7 days')
    ON CONFLICT DO NOTHING;
END $$;

-- Update demo doctor rating from new review
UPDATE doctors
SET average_rating = (
    SELECT ROUND(AVG(r.rating)::numeric, 2)
    FROM doctor_reviews r
    WHERE r.doctor_id = 'b0000000-0000-0000-0000-000000000002'
)
WHERE id = 'b0000000-0000-0000-0000-000000000002';

-- Generate completed appointments for new demo patients with random existing doctors
DO $$
DECLARE
    patients UUID[] := ARRAY[
        'c1000000-0000-0000-0000-000000000001'::UUID,
        'c1000000-0000-0000-0000-000000000002'::UUID,
        'c1000000-0000-0000-0000-000000000003'::UUID,
        'c1000000-0000-0000-0000-000000000004'::UUID
    ];
    doctors_arr UUID[];
    pat UUID;
    doc UUID;
    slot_id UUID;
    appt_id UUID;
    offset_days INT;
    i INT;
BEGIN
    SELECT ARRAY(SELECT id FROM doctors ORDER BY license_number LIMIT 12) INTO doctors_arr;

    FOREACH pat IN ARRAY patients LOOP
        FOR i IN 1..3 LOOP
            doc := doctors_arr[1 + ((i + array_position(patients, pat)) % array_length(doctors_arr, 1))];
            offset_days := 10 * i + array_position(patients, pat);
            slot_id := gen_random_uuid();
            appt_id := gen_random_uuid();

            INSERT INTO time_slots (id, doctor_id, start_time, end_time, is_booked, appointment_type)
            VALUES (slot_id, doc,
                    NOW() - (offset_days || ' days')::INTERVAL + INTERVAL '10 hours',
                    NOW() - (offset_days || ' days')::INTERVAL + INTERVAL '11 hours',
                    true,
                    CASE WHEN i % 2 = 0 THEN 'ONLINE' ELSE 'OFFLINE' END::text::appointment_type)
            ON CONFLICT DO NOTHING;

            INSERT INTO appointments (id, patient_id, doctor_id, slot_id, status, type,
                                      payment_status, payment_amount, created_at, updated_at)
            VALUES (appt_id, pat, doc, slot_id, 'COMPLETED',
                    CASE WHEN i % 2 = 0 THEN 'ONLINE' ELSE 'OFFLINE' END::text::appointment_type,
                    'PAID',
                    (SELECT consultation_fee FROM doctors WHERE id = doc),
                    NOW() - (offset_days || ' days')::INTERVAL,
                    NOW() - (offset_days || ' days')::INTERVAL)
            ON CONFLICT DO NOTHING;

            -- Add review for first appointment of each patient
            IF i = 1 THEN
                INSERT INTO doctor_reviews (id, appointment_id, doctor_id, patient_id, rating, comment, is_anonymous, created_at)
                VALUES (gen_random_uuid(), appt_id, doc, pat,
                        4 + (array_position(patients, pat) % 2),
                        CASE array_position(patients, pat) % 4
                            WHEN 0 THEN 'Очень доволен приёмом, врач всё объяснил и ответил на все вопросы.'
                            WHEN 1 THEN 'Профессиональный подход, быстро поставил диагноз. Рекомендую.'
                            WHEN 2 THEN 'Хороший специалист, внимательный и вежливый. Спасибо.'
                            ELSE 'Отличная клиника и замечательный врач. Буду обращаться снова.'
                        END,
                        array_position(patients, pat) = 3,
                        NOW() - ((offset_days - 1) || ' days')::INTERVAL)
                ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- Refresh average ratings for all doctors after new reviews
UPDATE doctors d
SET average_rating = COALESCE((
    SELECT ROUND(AVG(r.rating)::numeric, 2)
    FROM doctor_reviews r
    WHERE r.doctor_id = d.id
), d.average_rating);
