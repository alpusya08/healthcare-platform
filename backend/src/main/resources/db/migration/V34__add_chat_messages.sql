CREATE TABLE chat_messages (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID        NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    sender_id      UUID        NOT NULL,
    sender_role    VARCHAR(10) NOT NULL CHECK (sender_role IN ('PATIENT', 'DOCTOR')),
    sender_name    VARCHAR(255) NOT NULL,
    content        TEXT        NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at        TIMESTAMPTZ
);

CREATE INDEX idx_chat_messages_appt_time ON chat_messages(appointment_id, created_at);
