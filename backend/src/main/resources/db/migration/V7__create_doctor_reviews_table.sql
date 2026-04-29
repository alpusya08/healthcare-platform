-- Patient-authored reviews of doctors after a completed appointment.
-- Reviews are auto-published (no moderation) and one review per appointment.

CREATE TABLE doctor_reviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id  UUID NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
    doctor_id       UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_doctor_reviews_doctor_created ON doctor_reviews(doctor_id, created_at DESC);
CREATE INDEX idx_doctor_reviews_patient ON doctor_reviews(patient_id);
