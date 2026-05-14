-- Add appointment_type and is_blocked to time_slots
ALTER TABLE time_slots
    ADD COLUMN IF NOT EXISTS appointment_type VARCHAR(20) NOT NULL DEFAULT 'BOTH',
    ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT FALSE;

-- Create schedule_templates table for doctor weekly templates
CREATE TABLE IF NOT EXISTS schedule_templates (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id   UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL,           -- 1=Mon .. 7=Sun
    start_hour  SMALLINT NOT NULL,
    start_min   SMALLINT NOT NULL DEFAULT 0,
    end_hour    SMALLINT NOT NULL,
    end_min     SMALLINT NOT NULL DEFAULT 0,
    slot_duration_min  SMALLINT NOT NULL DEFAULT 60,
    appointment_type   VARCHAR(20) NOT NULL DEFAULT 'BOTH',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (doctor_id, day_of_week, start_hour, start_min)
);

CREATE INDEX IF NOT EXISTS idx_schedule_templates_doctor ON schedule_templates(doctor_id);
