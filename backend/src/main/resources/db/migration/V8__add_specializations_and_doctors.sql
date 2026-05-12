-- Add missing specializations
INSERT INTO specializations (id, code, display_name, description, has_ai_support) VALUES
  (gen_random_uuid(), 'gastroenterology', 'Гастроэнтерология', 'Диагностика и лечение заболеваний ЖКТ, печени и поджелудочной железы.', false),
  (gen_random_uuid(), 'orthopedics',      'Ортопедия',         'Лечение заболеваний опорно-двигательного аппарата, суставов и костей.',  false),
  (gen_random_uuid(), 'surgery',          'Хирургия',          'Оперативное лечение острых и хронических хирургических заболеваний.',     false),
  (gen_random_uuid(), 'pulmonology',      'Пульмонология',     'Диагностика и лечение заболеваний органов дыхания и лёгких.',            false),
  (gen_random_uuid(), 'otolaryngology',   'Оториноларингология','Лечение заболеваний уха, горла, носа и смежных областей.',              false)
ON CONFLICT (code) DO NOTHING;

-- Demo doctors for new specializations (password = same as existing demo doctors)
-- Gastroenterology doctor
INSERT INTO users (id, email, password_hash, full_name, role, status)
VALUES (
  'a1b2c3d4-0001-0001-0001-000000000001',
  'dr.seitkali2@medai.kz',
  '$2a$12$euFm13h0T2Go7loYIvl9gO9d..mC3oLP/PQ1M9HDmlP260RUSMuAa',
  'Мадина Сейткали',
  'DOCTOR', 'ACTIVE'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO doctors (id, specialization_id, license_number, years_experience, bio, consultation_fee, verified)
SELECT 'a1b2c3d4-0001-0001-0001-000000000001', id, 'KZ-GASTRO-001', 8,
  'Врач-гастроэнтеролог с 8-летним опытом. Специализация: гастрит, язвенная болезнь, СРК, гепатит.',
  8500, true
FROM specializations WHERE code = 'gastroenterology'
ON CONFLICT (id) DO NOTHING;

-- Orthopedics doctor
INSERT INTO users (id, email, password_hash, full_name, role, status)
VALUES (
  'a1b2c3d4-0002-0002-0002-000000000002',
  'dr.orto@medai.kz',
  '$2a$12$euFm13h0T2Go7loYIvl9gO9d..mC3oLP/PQ1M9HDmlP260RUSMuAa',
  'Бауыржан Омаров',
  'DOCTOR', 'ACTIVE'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO doctors (id, specialization_id, license_number, years_experience, bio, consultation_fee, verified)
SELECT 'a1b2c3d4-0002-0002-0002-000000000002', id, 'KZ-ORTHO-001', 12,
  'Ортопед-травматолог. Лечение заболеваний суставов, позвоночника, спортивные травмы.',
  9000, true
FROM specializations WHERE code = 'orthopedics'
ON CONFLICT (id) DO NOTHING;

-- Pulmonology doctor
INSERT INTO users (id, email, password_hash, full_name, role, status)
VALUES (
  'a1b2c3d4-0003-0003-0003-000000000003',
  'dr.pulmo@medai.kz',
  '$2a$12$euFm13h0T2Go7loYIvl9gO9d..mC3oLP/PQ1M9HDmlP260RUSMuAa',
  'Айдана Рысбекова',
  'DOCTOR', 'ACTIVE'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO doctors (id, specialization_id, license_number, years_experience, bio, consultation_fee, verified)
SELECT 'a1b2c3d4-0003-0003-0003-000000000003', id, 'KZ-PULMO-001', 6,
  'Пульмонолог. Диагностика и лечение бронхита, астмы, пневмонии, ХОБЛ.',
  7500, true
FROM specializations WHERE code = 'pulmonology'
ON CONFLICT (id) DO NOTHING;

-- Neurology doctor (another one)
INSERT INTO users (id, email, password_hash, full_name, role, status)
VALUES (
  'a1b2c3d4-0004-0004-0004-000000000004',
  'dr.neuro@medai.kz',
  '$2a$12$euFm13h0T2Go7loYIvl9gO9d..mC3oLP/PQ1M9HDmlP260RUSMuAa',
  'Дамир Ахметов',
  'DOCTOR', 'ACTIVE'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO doctors (id, specialization_id, license_number, years_experience, bio, consultation_fee, verified)
SELECT 'a1b2c3d4-0004-0004-0004-000000000004', id, 'KZ-NEURO-001', 10,
  'Невролог. Головные боли, мигрень, остеохондроз, нарушения сна, вегетативные расстройства.',
  8000, true
FROM specializations WHERE code = 'neurology'
ON CONFLICT (id) DO NOTHING;

-- Generate time slots for next 14 days for all new doctors
DO $$
DECLARE
  doctor_ids UUID[] := ARRAY[
    'a1b2c3d4-0001-0001-0001-000000000001'::UUID,
    'a1b2c3d4-0002-0002-0002-000000000002'::UUID,
    'a1b2c3d4-0003-0003-0003-000000000003'::UUID,
    'a1b2c3d4-0004-0004-0004-000000000004'::UUID
  ];
  doc_id UUID;
  day_offset INT;
  hour_offset INT;
  slot_start TIMESTAMPTZ;
BEGIN
  FOREACH doc_id IN ARRAY doctor_ids LOOP
    FOR day_offset IN 1..14 LOOP
      -- Skip weekends
      IF EXTRACT(DOW FROM (CURRENT_DATE + day_offset)) IN (0, 6) THEN
        CONTINUE;
      END IF;
      FOR hour_offset IN 0..7 LOOP
        slot_start := (CURRENT_DATE + day_offset) + (9 * INTERVAL '1 hour') + (hour_offset * INTERVAL '30 minutes');
        INSERT INTO time_slots (doctor_id, start_time, end_time)
        VALUES (doc_id, slot_start, slot_start + INTERVAL '30 minutes')
        ON CONFLICT DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
