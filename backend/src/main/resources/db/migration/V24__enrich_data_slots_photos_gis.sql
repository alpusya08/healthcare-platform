-- ═══════════════════════════════════════════════════════════
-- V24: Fix expired slots + photos + 2GIS + rich demo data
-- ═══════════════════════════════════════════════════════════

-- 1. Add photo_url and gis_url to clinics
ALTER TABLE clinics
    ADD COLUMN IF NOT EXISTS photo_url  TEXT,
    ADD COLUMN IF NOT EXISTS gis_url    TEXT,
    ADD COLUMN IF NOT EXISTS lat        NUMERIC(10,7),
    ADD COLUMN IF NOT EXISTS lng        NUMERIC(10,7);

-- 2. Add photo_url to doctors
ALTER TABLE doctors
    ADD COLUMN IF NOT EXISTS photo_url  TEXT;

-- ──────────────────────────────────────────────────────────
-- 3. Fix slots: delete all unbooked past slots, regenerate fresh
-- ──────────────────────────────────────────────────────────
-- Delete past unbooked slots that have no appointment references
DELETE FROM time_slots
WHERE start_time < NOW()
  AND is_booked = false
  AND NOT EXISTS (
      SELECT 1 FROM appointments a WHERE a.time_slot_id = time_slots.id
  );

-- Generate 90-day fresh slots for every verified doctor
-- Mon-Fri, 09:00-18:00, 1-hour slots
DO $$
DECLARE
    doc RECORD;
    day_offset INT;
    slot_hour  INT;
    slot_start TIMESTAMPTZ;
    dow        INT;
BEGIN
    FOR doc IN SELECT id FROM doctors WHERE verified = true LOOP
        FOR day_offset IN 1..90 LOOP
            slot_start := date_trunc('day', NOW() + (day_offset || ' days')::interval);
            dow := EXTRACT(DOW FROM slot_start);
            CONTINUE WHEN dow IN (0, 6); -- skip weekends

            FOR slot_hour IN 9..17 LOOP
                CONTINUE WHEN slot_hour = 13; -- lunch break
                INSERT INTO time_slots (doctor_id, start_time, end_time, is_booked, is_blocked, appointment_type)
                VALUES (
                    doc.id,
                    slot_start + (slot_hour || ' hours')::interval,
                    slot_start + ((slot_hour + 1) || ' hours')::interval,
                    false, false, 'BOTH'
                )
                ON CONFLICT DO NOTHING;
            END LOOP;
        END LOOP;
    END LOOP;
END $$;

-- ──────────────────────────────────────────────────────────
-- 4. Update existing clinics with photos and 2GIS links
-- ──────────────────────────────────────────────────────────
UPDATE clinics SET
    photo_url = 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80',
    gis_url   = 'https://2gis.kz/almaty/search/Семейный+доктор',
    lat       = 43.2391, lng = 76.8897,
    phone     = '+7 (727) 350-11-22',
    working_hours = 'Пн–Пт: 08:00–20:00, Сб: 09:00–17:00'
WHERE name LIKE '%Семейный доктор%';

UPDATE clinics SET
    photo_url = 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800&q=80',
    gis_url   = 'https://2gis.kz/almaty/search/Наурыз+Медикал',
    lat       = 43.2216, lng = 76.9406,
    phone     = '+7 (727) 270-22-33',
    working_hours = 'Пн–Сб: 08:00–21:00, Вс: 09:00–18:00'
WHERE name LIKE '%Наурыз%';

UPDATE clinics SET
    photo_url = 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=800&q=80',
    gis_url   = 'https://2gis.kz/almaty/search/MedLife+диагностический',
    lat       = 43.2562, lng = 76.9286,
    phone     = '+7 (727) 291-33-44',
    working_hours = 'Пн–Пт: 07:30–21:00, Сб–Вс: 09:00–17:00'
WHERE name LIKE '%MedLife%';

UPDATE clinics SET
    photo_url = 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80',
    gis_url   = 'https://2gis.kz/almaty/search/КардиоПлюс',
    lat       = 43.2502, lng = 76.9118,
    phone     = '+7 (727) 313-44-55',
    working_hours = 'Пн–Пт: 08:00–18:00'
WHERE name LIKE '%КардиоПлюс%';

UPDATE clinics SET
    photo_url = 'https://images.unsplash.com/photo-1504813184591-01572f98c85f?w=800&q=80',
    gis_url   = 'https://2gis.kz/almaty/search/АлатауМед',
    lat       = 43.3182, lng = 76.9714,
    phone     = '+7 (727) 380-55-66',
    working_hours = 'Пн–Вс: 08:00–22:00'
WHERE name LIKE '%Алатау%';

UPDATE clinics SET
    photo_url = 'https://images.unsplash.com/photo-1584515933487-779824d29309?w=800&q=80',
    gis_url   = 'https://2gis.kz/almaty/search/БалаМед',
    lat       = 43.2312, lng = 76.9401,
    phone     = '+7 (727) 265-66-77',
    working_hours = 'Пн–Сб: 08:00–20:00'
WHERE name LIKE '%БалаМед%';

UPDATE clinics SET
    photo_url = 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=800&q=80',
    gis_url   = 'https://2gis.kz/almaty/search/Республиканская+клиническая+больница',
    lat       = 43.2541, lng = 76.9217,
    phone     = '+7 (727) 233-77-88',
    working_hours = 'Круглосуточно'
WHERE name LIKE '%Республиканская%';

-- ──────────────────────────────────────────────────────────
-- 5. Add more rich clinics
-- ──────────────────────────────────────────────────────────
INSERT INTO clinics (name, address, city, phone, email, description, working_hours, website, photo_url, gis_url, lat, lng)
VALUES
(
    'Клиника "Олимп"',
    'ул. Байзакова 280',
    'Алматы',
    '+7 (727) 394-11-00',
    'info@olimp.kz',
    'Многопрофильная клиника высшего класса в центре Алматы. Современное оборудование европейского уровня, команда опытных специалистов. Полный спектр диагностики и лечения. Принимаем пациентов с полисами всех страховых компаний.',
    'Пн–Пт: 08:00–20:00, Сб–Вс: 09:00–17:00',
    'https://olimp.kz',
    'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=800&q=80',
    'https://2gis.kz/almaty/search/Олимп+клиника',
    43.2456, 76.9234
),
(
    'Медицинский центр "Медикер"',
    'мкр. Самал-1, ул. Жолдасбекова 13',
    'Алматы',
    '+7 (727) 258-00-58',
    'info@mediker.kz',
    'Сеть современных медицинских центров в Алматы. Специализируемся на терапии, педиатрии, гинекологии и хирургии. Собственная лаборатория с результатами в день обращения. Запись онлайн 24/7.',
    'Пн–Пт: 07:30–21:00, Сб–Вс: 08:00–20:00',
    'https://mediker.kz',
    'https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?w=800&q=80',
    'https://2gis.kz/almaty/firm/141265769348288',
    43.2294, 76.9376
),
(
    'Центр восстановительной медицины "Реабилитация"',
    'пр. Аль-Фараби 7',
    'Алматы',
    '+7 (727) 321-20-20',
    'rehab@rehabcenter.kz',
    'Специализированный центр реабилитации и восстановительного лечения. Физиотерапия, ЛФК, массаж, иглорефлексотерапия. Работаем с пациентами после операций и травм. Индивидуальные программы восстановления.',
    'Пн–Сб: 08:00–19:00',
    NULL,
    'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=800&q=80',
    'https://2gis.kz/almaty/search/реабилитация+Аль-Фараби',
    43.2221, 76.8881
),
(
    'Стоматологическая клиника "DentArt"',
    'ул. Достык 52, БЦ Кок-Тобе',
    'Алматы',
    '+7 (727) 311-88-88',
    'hello@dentart.kz',
    'Клиника эстетической стоматологии и имплантологии. Виниры, брекеты, отбеливание зубов, имплантаты. Работаем с анестезией последнего поколения. Принимаем пациентов с детского возраста.',
    'Пн–Сб: 09:00–21:00, Вс: 10:00–18:00',
    'https://dentart.kz',
    'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=800&q=80',
    'https://2gis.kz/almaty/search/DentArt+стоматология',
    43.2362, 76.9486
),
(
    'Перинатальный центр "Ана"',
    'мкр. Думан, ул. Момышулы 2А',
    'Алматы',
    '+7 (727) 245-90-90',
    'info@ana-center.kz',
    'Специализированный перинатальный центр. Ведение беременности, роды, гинекология, ЭКО. Команда из 40+ акушеров-гинекологов. Индивидуальные роды с партнёром. Палаты повышенного комфорта.',
    'Круглосуточно',
    'https://ana-center.kz',
    'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&q=80',
    'https://2gis.kz/almaty/search/перинатальный+центр+Ана',
    43.1892, 76.8612
),
(
    'Офтальмологическая клиника "ОкоМед"',
    'ул. Гагарина 133',
    'Алматы',
    '+7 (727) 376-55-44',
    'info@okomed.kz',
    'Специализированная офтальмологическая клиника. Лазерная коррекция зрения, лечение катаракты и глаукомы. Операционный блок европейского класса. Принимаем пациентов от 3 лет. Современная диагностика зрения.',
    'Пн–Пт: 08:00–19:00, Сб: 09:00–15:00',
    NULL,
    'https://images.unsplash.com/photo-1583324113626-70df0f4deaab?w=800&q=80',
    'https://2gis.kz/almaty/search/ОкоМед+офтальмология',
    43.2488, 76.9622
),
(
    'МЦ "Спасение"',
    'ул. Бегалина 16',
    'Алматы',
    '+7 (727) 234-11-11',
    'info@spasenie.kz',
    'Круглосуточная скорая медицинская помощь и стационар. Экстренная хирургия, реанимация, интенсивная терапия. Вертолётная площадка, 2 операционных зала. Аккредитованы JCI.',
    'Круглосуточно',
    NULL,
    'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800&q=80',
    'https://2gis.kz/almaty/search/Спасение+скорая',
    43.2573, 76.9065
),
(
    'Лаборатория "ЛабМед"',
    'ул. Толе би 273',
    'Алматы',
    '+7 (727) 269-33-33',
    'lab@labmed.kz',
    'Сертифицированная медицинская лаборатория. Более 1000 видов анализов. Результаты в личном кабинете за 2–24 часа. Выездной забор крови на дому. Работаем с коммерческими и страховыми пациентами.',
    'Пн–Пт: 07:00–20:00, Сб–Вс: 08:00–18:00',
    'https://labmed.kz',
    'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&q=80',
    'https://2gis.kz/almaty/search/ЛабМед+лаборатория',
    43.2618, 76.9132
);

-- ──────────────────────────────────────────────────────────
-- 6. Add photo URLs to existing doctors
-- ──────────────────────────────────────────────────────────
-- Photos from Unsplash - diverse professional medical headshots
UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80'
WHERE id = (SELECT id FROM users WHERE email = 'dr.seitkali@medai.kz');

UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&q=80'
WHERE id = (SELECT id FROM users WHERE email = 'dr.zhakupova@medai.kz');

UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?w=400&q=80'
WHERE id = (SELECT id FROM users WHERE email = 'dr.dosov@medai.kz');

UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&q=80'
WHERE id = (SELECT id FROM users WHERE email = 'dr.seitkali2@medai.kz');

UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80'
WHERE id = (SELECT id FROM users WHERE email = 'dr.orto@medai.kz');

UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=400&q=80'
WHERE id = (SELECT id FROM users WHERE email = 'dr.pulmo@medai.kz');

UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&q=80'
WHERE id = (SELECT id FROM users WHERE email = 'dr.neuro@medai.kz');

UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1527613426441-4da17471b66d?w=400&q=80'
WHERE id = (SELECT id FROM users WHERE email = 'dr.bekova@medai.kz');

UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&q=80'
WHERE id = (SELECT id FROM users WHERE email = 'dr.abenov@medai.kz');

UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1638202993928-7267aad84c31?w=400&q=80'
WHERE id = (SELECT id FROM users WHERE email = 'dr.nurova@medai.kz');

UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=400&q=80'
WHERE id = (SELECT id FROM users WHERE email = 'dr.smagulova@medai.kz');

UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&q=80'
WHERE id = (SELECT id FROM users WHERE email = 'dr.rakhimov@medai.kz');

UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1681896791046-cd3e3db2acde?w=400&q=80'
WHERE id = (SELECT id FROM users WHERE email = 'dr.kaliyev@medai.kz');

-- Remaining doctors - batch update by specialization for variety
UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1614608682850-e0d6ed316d47?w=400&q=80'
WHERE photo_url IS NULL AND id = (SELECT d.id FROM doctors d JOIN specializations s ON d.specialization_id = s.id WHERE s.code = 'dermatology' AND d.photo_url IS NULL ORDER BY d.id LIMIT 1);

UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1643297654416-05795d62e39c?w=400&q=80'
WHERE photo_url IS NULL AND id IN (SELECT d.id FROM doctors d JOIN specializations s ON d.specialization_id = s.id WHERE s.code = 'dermatology');

UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=400&q=80'
WHERE photo_url IS NULL AND id = (SELECT d.id FROM doctors d JOIN specializations s ON d.specialization_id = s.id WHERE s.code = 'endocrinology' AND d.photo_url IS NULL ORDER BY d.id LIMIT 1);

UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1622902046580-2b47f47f5471?w=400&q=80'
WHERE photo_url IS NULL AND id IN (SELECT d.id FROM doctors d JOIN specializations s ON d.specialization_id = s.id WHERE s.code = 'endocrinology');

UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1612531386530-97286d97c2d2?w=400&q=80'
WHERE photo_url IS NULL AND id = (SELECT d.id FROM doctors d JOIN specializations s ON d.specialization_id = s.id WHERE s.code = 'gastroenterology' AND d.photo_url IS NULL ORDER BY d.id LIMIT 1);

UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1618498082410-b4aa22193b38?w=400&q=80'
WHERE photo_url IS NULL AND id IN (SELECT d.id FROM doctors d JOIN specializations s ON d.specialization_id = s.id WHERE s.code = 'gastroenterology');

UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1666214280429-5c2a8c680082?w=400&q=80'
WHERE photo_url IS NULL AND id = (SELECT d.id FROM doctors d JOIN specializations s ON d.specialization_id = s.id WHERE s.code = 'orthopedics' AND d.photo_url IS NULL ORDER BY d.id LIMIT 1);

UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1682562163503-34a0e1be5b63?w=400&q=80'
WHERE photo_url IS NULL AND id IN (SELECT d.id FROM doctors d JOIN specializations s ON d.specialization_id = s.id WHERE s.code = 'orthopedics');

UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1593085512500-5d55148d6f0d?w=400&q=80'
WHERE photo_url IS NULL AND id = (SELECT d.id FROM doctors d JOIN specializations s ON d.specialization_id = s.id WHERE s.code = 'otolaryngology' AND d.photo_url IS NULL ORDER BY d.id LIMIT 1);

UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1603796846097-bee99e4a601f?w=400&q=80'
WHERE photo_url IS NULL AND id IN (SELECT d.id FROM doctors d JOIN specializations s ON d.specialization_id = s.id WHERE s.code = 'otolaryngology');

UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400&q=80'
WHERE photo_url IS NULL AND id = (SELECT d.id FROM doctors d JOIN specializations s ON d.specialization_id = s.id WHERE s.code = 'pulmonology' AND d.photo_url IS NULL ORDER BY d.id LIMIT 1);

UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=400&q=80'
WHERE photo_url IS NULL AND id IN (SELECT d.id FROM doctors d JOIN specializations s ON d.specialization_id = s.id WHERE s.code = 'pulmonology');

UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1571772996211-2f02c9727629?w=400&q=80'
WHERE photo_url IS NULL AND id = (SELECT d.id FROM doctors d JOIN specializations s ON d.specialization_id = s.id WHERE s.code = 'surgery' AND d.photo_url IS NULL ORDER BY d.id LIMIT 1);

UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400&q=80'
WHERE photo_url IS NULL AND id IN (SELECT d.id FROM doctors d JOIN specializations s ON d.specialization_id = s.id WHERE s.code = 'surgery');

-- Fallback for any remaining doctors without photos
UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80'
WHERE photo_url IS NULL;

-- ──────────────────────────────────────────────────────────
-- 7. Add demo reviews to make doctors look active
-- ──────────────────────────────────────────────────────────
DO $$
DECLARE
    pat_id UUID;
    appt_id UUID;
    doc RECORD;
    slot_id UUID;
    reviews_added INT := 0;
BEGIN
    SELECT id INTO pat_id FROM patients LIMIT 1;
    IF pat_id IS NULL THEN RETURN; END IF;

    FOR doc IN
        SELECT d.id FROM doctors d WHERE d.verified = true ORDER BY random() LIMIT 8
    LOOP
        -- Pick one available slot for this doctor
        SELECT ts.id INTO slot_id
        FROM time_slots ts
        WHERE ts.doctor_id = doc.id AND ts.is_booked = false
        LIMIT 1;

        IF slot_id IS NULL THEN CONTINUE; END IF;

        -- Mark slot as booked
        UPDATE time_slots SET is_booked = true WHERE id = slot_id;

        INSERT INTO appointments (patient_id, doctor_id, time_slot_id, status, type, complaint)
        VALUES (pat_id, doc.id, slot_id, 'COMPLETED', 'OFFLINE', 'Плановый осмотр')
        RETURNING id INTO appt_id;

        -- Add a review
        INSERT INTO doctor_reviews (appointment_id, doctor_id, patient_id, rating, comment, is_anonymous)
        VALUES (
            appt_id,
            doc.id,
            pat_id,
            (4 + (random() * 1)::int)::smallint,
            (ARRAY[
                'Отличный специалист! Внимательно выслушал, назначил грамотное лечение.',
                'Профессиональный врач, объяснил всё доступно. Рекомендую!',
                'Очень доволен приёмом. Врач внимательный и компетентный.',
                'Хороший доктор, помог разобраться с проблемой. Спасибо!',
                'Приятный в общении специалист. Назначенное лечение помогло.'
            ])[floor(random()*5+1)::int],
            (random() > 0.7)
        )
        ON CONFLICT DO NOTHING;

        reviews_added := reviews_added + 1;
    END LOOP;
END $$;

-- Recompute ratings for all doctors after reviews
UPDATE doctors d SET average_rating = (
    SELECT ROUND(AVG(r.rating)::numeric, 1)
    FROM doctor_reviews r
    WHERE r.doctor_id = d.id
)
WHERE EXISTS (SELECT 1 FROM doctor_reviews r WHERE r.doctor_id = d.id);
