-- Add more doctors for all specializations so every spec has at least 3 doctors
-- Password hash = Demo1234! (same as existing demo doctors)

-- ─── DERMATOLOGY (+2) ───────────────────────────────────────────
INSERT INTO users (id, email, password_hash, full_name, role, status) VALUES
  ('b1000001-0001-0001-0001-000000000001', 'dr.derm2@medai.kz', '$2a$12$euFm13h0T2Go7loYIvl9gO9d..mC3oLP/PQ1M9HDmlP260RUSMuAa', 'Арман Джаксыбеков', 'DOCTOR', 'ACTIVE'),
  ('b1000001-0001-0001-0001-000000000002', 'dr.derm3@medai.kz', '$2a$12$euFm13h0T2Go7loYIvl9gO9d..mC3oLP/PQ1M9HDmlP260RUSMuAa', 'Назгуль Ахметова', 'DOCTOR', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO doctors (id, specialization_id, license_number, years_experience, bio, consultation_fee, verified, average_rating)
SELECT 'b1000001-0001-0001-0001-000000000001', id, 'KZ-DERM-002', 7,
  'Дерматолог-косметолог. Акне, псориаз, дерматит, эстетические процедуры. Принимает детей и взрослых.', 9000, true, 4.7
FROM specializations WHERE code = 'dermatology' ON CONFLICT (id) DO NOTHING;

INSERT INTO doctors (id, specialization_id, license_number, years_experience, bio, consultation_fee, verified, average_rating)
SELECT 'b1000001-0001-0001-0001-000000000002', id, 'KZ-DERM-003', 4,
  'Дерматолог. Специализация: аллергические дерматозы, грибковые инфекции, кожные новообразования.', 7000, true, 4.5
FROM specializations WHERE code = 'dermatology' ON CONFLICT (id) DO NOTHING;

-- ─── ENDOCRINOLOGY (+2) ─────────────────────────────────────────
INSERT INTO users (id, email, password_hash, full_name, role, status) VALUES
  ('b2000002-0002-0002-0002-000000000001', 'dr.endo2@medai.kz', '$2a$12$euFm13h0T2Go7loYIvl9gO9d..mC3oLP/PQ1M9HDmlP260RUSMuAa', 'Болат Нурмаганбетов', 'DOCTOR', 'ACTIVE'),
  ('b2000002-0002-0002-0002-000000000002', 'dr.endo3@medai.kz', '$2a$12$euFm13h0T2Go7loYIvl9gO9d..mC3oLP/PQ1M9HDmlP260RUSMuAa', 'Жания Сейткали', 'DOCTOR', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO doctors (id, specialization_id, license_number, years_experience, bio, consultation_fee, verified, average_rating)
SELECT 'b2000002-0002-0002-0002-000000000001', id, 'KZ-ENDO-002', 11,
  'Эндокринолог. Сахарный диабет 1 и 2 типа, заболевания щитовидной железы, ожирение, остеопороз.', 10000, true, 4.8
FROM specializations WHERE code = 'endocrinology' ON CONFLICT (id) DO NOTHING;

INSERT INTO doctors (id, specialization_id, license_number, years_experience, bio, consultation_fee, verified, average_rating)
SELECT 'b2000002-0002-0002-0002-000000000002', id, 'KZ-ENDO-003', 6,
  'Эндокринолог, диетолог. Нарушения обмена веществ, лишний вес, гормональный дисбаланс.', 8500, true, 4.6
FROM specializations WHERE code = 'endocrinology' ON CONFLICT (id) DO NOTHING;

-- ─── GASTROENTEROLOGY (+2) ──────────────────────────────────────
INSERT INTO users (id, email, password_hash, full_name, role, status) VALUES
  ('b3000003-0003-0003-0003-000000000001', 'dr.gastro2@medai.kz', '$2a$12$euFm13h0T2Go7loYIvl9gO9d..mC3oLP/PQ1M9HDmlP260RUSMuAa', 'Серик Байжанов', 'DOCTOR', 'ACTIVE'),
  ('b3000003-0003-0003-0003-000000000002', 'dr.gastro3@medai.kz', '$2a$12$euFm13h0T2Go7loYIvl9gO9d..mC3oLP/PQ1M9HDmlP260RUSMuAa', 'Дина Карибаева', 'DOCTOR', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO doctors (id, specialization_id, license_number, years_experience, bio, consultation_fee, verified, average_rating)
SELECT 'b3000003-0003-0003-0003-000000000001', id, 'KZ-GASTRO-002', 14,
  'Гастроэнтеролог-гепатолог. Язвенная болезнь, цирроз печени, воспалительные заболевания кишечника.', 11000, true, 4.9
FROM specializations WHERE code = 'gastroenterology' ON CONFLICT (id) DO NOTHING;

INSERT INTO doctors (id, specialization_id, license_number, years_experience, bio, consultation_fee, verified, average_rating)
SELECT 'b3000003-0003-0003-0003-000000000002', id, 'KZ-GASTRO-003', 5,
  'Гастроэнтеролог. СРК, функциональные расстройства ЖКТ, ГЭРБ, хронический гастрит.', 7500, true, 4.4
FROM specializations WHERE code = 'gastroenterology' ON CONFLICT (id) DO NOTHING;

-- ─── ORTHOPEDICS (+2) ───────────────────────────────────────────
INSERT INTO users (id, email, password_hash, full_name, role, status) VALUES
  ('b4000004-0004-0004-0004-000000000001', 'dr.ortho2@medai.kz', '$2a$12$euFm13h0T2Go7loYIvl9gO9d..mC3oLP/PQ1M9HDmlP260RUSMuAa', 'Руслан Кенжебаев', 'DOCTOR', 'ACTIVE'),
  ('b4000004-0004-0004-0004-000000000002', 'dr.ortho3@medai.kz', '$2a$12$euFm13h0T2Go7loYIvl9gO9d..mC3oLP/PQ1M9HDmlP260RUSMuAa', 'Камила Тулегенова', 'DOCTOR', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO doctors (id, specialization_id, license_number, years_experience, bio, consultation_fee, verified, average_rating)
SELECT 'b4000004-0004-0004-0004-000000000001', id, 'KZ-ORTHO-002', 16,
  'Травматолог-ортопед. Замена суставов, лечение переломов, артроскопия, реабилитация.', 12000, true, 4.8
FROM specializations WHERE code = 'orthopedics' ON CONFLICT (id) DO NOTHING;

INSERT INTO doctors (id, specialization_id, license_number, years_experience, bio, consultation_fee, verified, average_rating)
SELECT 'b4000004-0004-0004-0004-000000000002', id, 'KZ-ORTHO-003', 7,
  'Ортопед. Заболевания позвоночника, плоскостопие, нарушения осанки, консервативное лечение.', 8000, true, 4.5
FROM specializations WHERE code = 'orthopedics' ON CONFLICT (id) DO NOTHING;

-- ─── PULMONOLOGY (+2) ───────────────────────────────────────────
INSERT INTO users (id, email, password_hash, full_name, role, status) VALUES
  ('b5000005-0005-0005-0005-000000000001', 'dr.pulmo2@medai.kz', '$2a$12$euFm13h0T2Go7loYIvl9gO9d..mC3oLP/PQ1M9HDmlP260RUSMuAa', 'Асхат Жумабеков', 'DOCTOR', 'ACTIVE'),
  ('b5000005-0005-0005-0005-000000000002', 'dr.pulmo3@medai.kz', '$2a$12$euFm13h0T2Go7loYIvl9gO9d..mC3oLP/PQ1M9HDmlP260RUSMuAa', 'Гаухар Исабекова', 'DOCTOR', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO doctors (id, specialization_id, license_number, years_experience, bio, consultation_fee, verified, average_rating)
SELECT 'b5000005-0005-0005-0005-000000000001', id, 'KZ-PULMO-002', 9,
  'Пульмонолог. Бронхиальная астма, ХОБЛ, пневмонии, плеврит, кашель неясной этиологии.', 9500, true, 4.7
FROM specializations WHERE code = 'pulmonology' ON CONFLICT (id) DO NOTHING;

INSERT INTO doctors (id, specialization_id, license_number, years_experience, bio, consultation_fee, verified, average_rating)
SELECT 'b5000005-0005-0005-0005-000000000002', id, 'KZ-PULMO-003', 4,
  'Пульмонолог, аллерголог. Аллергический ринит, астма, поствирусный кашель.', 7000, true, 4.3
FROM specializations WHERE code = 'pulmonology' ON CONFLICT (id) DO NOTHING;

-- ─── SURGERY (+3) ───────────────────────────────────────────────
INSERT INTO users (id, email, password_hash, full_name, role, status) VALUES
  ('b6000006-0006-0006-0006-000000000001', 'dr.surg1@medai.kz', '$2a$12$euFm13h0T2Go7loYIvl9gO9d..mC3oLP/PQ1M9HDmlP260RUSMuAa', 'Нурлан Абдрахманов', 'DOCTOR', 'ACTIVE'),
  ('b6000006-0006-0006-0006-000000000002', 'dr.surg2@medai.kz', '$2a$12$euFm13h0T2Go7loYIvl9gO9d..mC3oLP/PQ1M9HDmlP260RUSMuAa', 'Берик Сатыбалдиев', 'DOCTOR', 'ACTIVE'),
  ('b6000006-0006-0006-0006-000000000003', 'dr.surg3@medai.kz', '$2a$12$euFm13h0T2Go7loYIvl9gO9d..mC3oLP/PQ1M9HDmlP260RUSMuAa', 'Светлана Козлова', 'DOCTOR', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO doctors (id, specialization_id, license_number, years_experience, bio, consultation_fee, verified, average_rating)
SELECT 'b6000006-0006-0006-0006-000000000001', id, 'KZ-SURG-001', 18,
  'Хирург общей практики. Аппендицит, грыжи, желчнокаменная болезнь, лапароскопия.', 13000, true, 4.9
FROM specializations WHERE code = 'surgery' ON CONFLICT (id) DO NOTHING;

INSERT INTO doctors (id, specialization_id, license_number, years_experience, bio, consultation_fee, verified, average_rating)
SELECT 'b6000006-0006-0006-0006-000000000002', id, 'KZ-SURG-002', 12,
  'Хирург. Эндоскопические операции, лечение варикозной болезни, флебология.', 11000, true, 4.6
FROM specializations WHERE code = 'surgery' ON CONFLICT (id) DO NOTHING;

INSERT INTO doctors (id, specialization_id, license_number, years_experience, bio, consultation_fee, verified, average_rating)
SELECT 'b6000006-0006-0006-0006-000000000003', id, 'KZ-SURG-003', 8,
  'Хирург. Плановые и экстренные операции, амбулаторная хирургия, удаление новообразований.', 10000, true, 4.5
FROM specializations WHERE code = 'surgery' ON CONFLICT (id) DO NOTHING;

-- ─── OTOLARYNGOLOGY (+3) ────────────────────────────────────────
INSERT INTO users (id, email, password_hash, full_name, role, status) VALUES
  ('b7000007-0007-0007-0007-000000000001', 'dr.lor1@medai.kz', '$2a$12$euFm13h0T2Go7loYIvl9gO9d..mC3oLP/PQ1M9HDmlP260RUSMuAa', 'Айбек Мусаев', 'DOCTOR', 'ACTIVE'),
  ('b7000007-0007-0007-0007-000000000002', 'dr.lor2@medai.kz', '$2a$12$euFm13h0T2Go7loYIvl9gO9d..mC3oLP/PQ1M9HDmlP260RUSMuAa', 'Гульмира Алтынбекова', 'DOCTOR', 'ACTIVE'),
  ('b7000007-0007-0007-0007-000000000003', 'dr.lor3@medai.kz', '$2a$12$euFm13h0T2Go7loYIvl9gO9d..mC3oLP/PQ1M9HDmlP260RUSMuAa', 'Тимур Сагиндыков', 'DOCTOR', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO doctors (id, specialization_id, license_number, years_experience, bio, consultation_fee, verified, average_rating)
SELECT 'b7000007-0007-0007-0007-000000000001', id, 'KZ-LOR-001', 13,
  'ЛОР-хирург. Риносинуситы, тонзиллиты, нарушения слуха, операции на ЛОР-органах.', 10000, true, 4.8
FROM specializations WHERE code = 'otolaryngology' ON CONFLICT (id) DO NOTHING;

INSERT INTO doctors (id, specialization_id, license_number, years_experience, bio, consultation_fee, verified, average_rating)
SELECT 'b7000007-0007-0007-0007-000000000002', id, 'KZ-LOR-002', 8,
  'ЛОР. Аллергический ринит, полипы, ангины, отиты, потеря слуха у детей и взрослых.', 8000, true, 4.6
FROM specializations WHERE code = 'otolaryngology' ON CONFLICT (id) DO NOTHING;

INSERT INTO doctors (id, specialization_id, license_number, years_experience, bio, consultation_fee, verified, average_rating)
SELECT 'b7000007-0007-0007-0007-000000000003', id, 'KZ-LOR-003', 5,
  'ЛОР. Храп, нарушения дыхания через нос, острые и хронические ЛОР-заболевания.', 7000, true, 4.4
FROM specializations WHERE code = 'otolaryngology' ON CONFLICT (id) DO NOTHING;

-- ─── Generate slots for all new doctors (next 14 working days) ──
DO $$
DECLARE
  new_doctor_ids UUID[] := ARRAY[
    'b1000001-0001-0001-0001-000000000001'::UUID, 'b1000001-0001-0001-0001-000000000002'::UUID,
    'b2000002-0002-0002-0002-000000000001'::UUID, 'b2000002-0002-0002-0002-000000000002'::UUID,
    'b3000003-0003-0003-0003-000000000001'::UUID, 'b3000003-0003-0003-0003-000000000002'::UUID,
    'b4000004-0004-0004-0004-000000000001'::UUID, 'b4000004-0004-0004-0004-000000000002'::UUID,
    'b5000005-0005-0005-0005-000000000001'::UUID, 'b5000005-0005-0005-0005-000000000002'::UUID,
    'b6000006-0006-0006-0006-000000000001'::UUID, 'b6000006-0006-0006-0006-000000000002'::UUID, 'b6000006-0006-0006-0006-000000000003'::UUID,
    'b7000007-0007-0007-0007-000000000001'::UUID, 'b7000007-0007-0007-0007-000000000002'::UUID, 'b7000007-0007-0007-0007-000000000003'::UUID
  ];
  doc_id UUID;
  day_offset INT;
  hour_offset INT;
  slot_start TIMESTAMPTZ;
BEGIN
  FOREACH doc_id IN ARRAY new_doctor_ids LOOP
    FOR day_offset IN 1..14 LOOP
      IF EXTRACT(DOW FROM (CURRENT_DATE + day_offset)) IN (0, 6) THEN CONTINUE; END IF;
      FOR hour_offset IN 0..7 LOOP
        slot_start := (CURRENT_DATE + day_offset) + (9 * INTERVAL '1 hour') + (hour_offset * INTERVAL '30 minutes');
        INSERT INTO time_slots (doctor_id, start_time, end_time)
        VALUES (doc_id, slot_start, slot_start + INTERVAL '30 minutes')
        ON CONFLICT DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
