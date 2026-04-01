CREATE TYPE feedback_verdict AS ENUM ('APPROVED', 'REJECTED', 'PARTIAL');

CREATE TABLE doctor_feedback (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id  UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    doctor_id       UUID NOT NULL REFERENCES doctors(id),
    ai_session_id   UUID,
    verdict         feedback_verdict NOT NULL,
    comment         TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_feedback_appointment ON doctor_feedback(appointment_id);
CREATE INDEX idx_feedback_doctor ON doctor_feedback(doctor_id);
