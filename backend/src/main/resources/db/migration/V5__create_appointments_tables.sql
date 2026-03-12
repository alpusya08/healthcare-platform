CREATE TYPE appointment_status AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
CREATE TYPE appointment_type AS ENUM ('ONLINE', 'OFFLINE');

CREATE TABLE time_slots (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id    UUID          NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    start_time   TIMESTAMPTZ   NOT NULL,
    end_time     TIMESTAMPTZ   NOT NULL,
    is_booked    BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_slot_order CHECK (end_time > start_time)
);
CREATE INDEX idx_time_slots_doctor ON time_slots(doctor_id, start_time) WHERE NOT is_booked;

CREATE TABLE appointments (
    id             UUID               PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id     UUID               NOT NULL REFERENCES patients(id),
    doctor_id      UUID               NOT NULL REFERENCES doctors(id),
    time_slot_id   UUID               NOT NULL UNIQUE REFERENCES time_slots(id),
    status         appointment_status NOT NULL DEFAULT 'SCHEDULED',
    type           appointment_type   NOT NULL DEFAULT 'OFFLINE',
    complaint      TEXT,
    ai_session_id  UUID,
    notes          TEXT,
    created_at     TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_appointments_patient ON appointments(patient_id, status);
CREATE INDEX idx_appointments_doctor  ON appointments(doctor_id, status);

CREATE TRIGGER trg_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Seed: 3 demo doctors ───────────────────────────────────────────────────
DO $$
DECLARE
    cardio_spec_id UUID;
    therapy_spec_id UUID;
    neuro_spec_id UUID;
    doc1_id UUID := uuid_generate_v4();
    doc2_id UUID := uuid_generate_v4();
    doc3_id UUID := uuid_generate_v4();
    demo_hash TEXT := crypt('Doctor123!', gen_salt('bf', 10));
    slot_start TIMESTAMPTZ;
    i INT;
BEGIN
    SELECT id INTO cardio_spec_id  FROM specializations WHERE code = 'cardiology'  LIMIT 1;
    SELECT id INTO therapy_spec_id FROM specializations WHERE code = 'therapy'     LIMIT 1;
    SELECT id INTO neuro_spec_id   FROM specializations WHERE code = 'neurology'   LIMIT 1;

    IF cardio_spec_id IS NULL THEN
        SELECT id INTO cardio_spec_id FROM specializations ORDER BY created_at LIMIT 1;
    END IF;
    IF therapy_spec_id IS NULL THEN
        therapy_spec_id := cardio_spec_id;
    END IF;
    IF neuro_spec_id IS NULL THEN
        neuro_spec_id := cardio_spec_id;
    END IF;

    INSERT INTO users(id, email, password_hash, full_name, role, status)
    VALUES
        (doc1_id, 'dr.seitkali@medai.kz', demo_hash, 'Алтынбек Сейткали', 'DOCTOR', 'ACTIVE'),
        (doc2_id, 'dr.zhakupova@medai.kz', demo_hash, 'Асель Жакупова', 'DOCTOR', 'ACTIVE'),
        (doc3_id, 'dr.dosov@medai.kz', demo_hash, 'Мухамед Досов', 'DOCTOR', 'ACTIVE');

    INSERT INTO doctors(id, specialization_id, license_number, years_experience, bio, consultation_fee, verified, verified_at)
    VALUES
        (doc1_id, cardio_spec_id, 'KZ-CARD-00101', 12,
         'Кардиолог высшей категории. Специализируется на ишемической болезни сердца и аритмиях.',
         8000.00, TRUE, NOW()),
        (doc2_id, therapy_spec_id, 'KZ-THER-00202', 8,
         'Терапевт широкого профиля. Принимает пациентов с любыми жалобами, направляет к профильным специалистам.',
         4500.00, TRUE, NOW()),
        (doc3_id, neuro_spec_id, 'KZ-NEUR-00303', 15,
         'Невролог. Занимается головными болями, мигренями, нарушениями сна и расстройствами нервной системы.',
         7000.00, TRUE, NOW());

    -- Generate 10 future time slots per doctor (every working day, 09:00–17:00, 30 min slots)
    FOR i IN 1..10 LOOP
        slot_start := date_trunc('day', NOW() + ((i) || ' days')::interval) + interval '09:00:00';
        -- Skip weekends
        IF EXTRACT(DOW FROM slot_start) IN (0, 6) THEN
            slot_start := slot_start + interval '2 days';
        END IF;
        INSERT INTO time_slots(doctor_id, start_time, end_time)
        VALUES
            (doc1_id, slot_start,               slot_start + interval '30 minutes'),
            (doc1_id, slot_start + interval '1 hour', slot_start + interval '1 hour 30 minutes'),
            (doc1_id, slot_start + interval '2 hours', slot_start + interval '2 hours 30 minutes'),
            (doc2_id, slot_start,               slot_start + interval '30 minutes'),
            (doc2_id, slot_start + interval '30 minutes', slot_start + interval '1 hour'),
            (doc2_id, slot_start + interval '3 hours', slot_start + interval '3 hours 30 minutes'),
            (doc3_id, slot_start + interval '1 hour', slot_start + interval '1 hour 30 minutes'),
            (doc3_id, slot_start + interval '2 hours 30 minutes', slot_start + interval '3 hours');
    END LOOP;
END $$;
