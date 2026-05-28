ALTER TABLE clinics
    ALTER COLUMN lat TYPE DOUBLE PRECISION USING lat::double precision,
    ALTER COLUMN lng TYPE DOUBLE PRECISION USING lng::double precision;
