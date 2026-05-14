-- Fix: Hibernate maps Java int to INTEGER, migration used SMALLINT
ALTER TABLE schedule_templates
    ALTER COLUMN day_of_week    TYPE INTEGER,
    ALTER COLUMN start_hour     TYPE INTEGER,
    ALTER COLUMN start_min      TYPE INTEGER,
    ALTER COLUMN end_hour       TYPE INTEGER,
    ALTER COLUMN end_min        TYPE INTEGER,
    ALTER COLUMN slot_duration_min TYPE INTEGER;
