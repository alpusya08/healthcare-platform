DELETE FROM time_slots
WHERE start_time > NOW()
  AND NOT is_booked
  AND id NOT IN (SELECT time_slot_id FROM appointments);

DO $$
DECLARE
    doc_id UUID;
    day_offset INT;
    target_date DATE;
    hour_val INT;
    slot_start TIMESTAMPTZ;
    slot_end TIMESTAMPTZ;
BEGIN
    FOR doc_id IN SELECT id FROM doctors LOOP
        FOR day_offset IN 0..13 LOOP
            target_date := CURRENT_DATE + day_offset;
            IF EXTRACT(DOW FROM target_date) IN (0, 6) THEN
                CONTINUE;
            END IF;
            FOR hour_val IN 9..16 LOOP
                slot_start := (target_date + (hour_val || ' hours')::INTERVAL) AT TIME ZONE 'UTC';
                slot_end := slot_start + INTERVAL '1 hour';
                INSERT INTO time_slots (id, doctor_id, start_time, end_time, is_booked)
                VALUES (gen_random_uuid(), doc_id, slot_start, slot_end, FALSE)
                ON CONFLICT DO NOTHING;
            END LOOP;
        END LOOP;
    END LOOP;
END $$;
