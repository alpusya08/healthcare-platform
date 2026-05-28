CREATE TYPE payment_status AS ENUM ('PENDING', 'PAID', 'REFUNDED');

ALTER TABLE appointments
    ADD COLUMN payment_status  payment_status NOT NULL DEFAULT 'PENDING',
    ADD COLUMN payment_amount  NUMERIC(12,2),
    ADD COLUMN paid_at         TIMESTAMPTZ;

CREATE INDEX idx_appointments_payment ON appointments(payment_status) WHERE payment_status = 'PENDING';
