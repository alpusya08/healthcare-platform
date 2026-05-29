-- Add clinic name and address fields to doctors for offline appointment display
ALTER TABLE doctors
    ADD COLUMN IF NOT EXISTS clinic_name    TEXT,
    ADD COLUMN IF NOT EXISTS clinic_address TEXT;

-- Assign Алматы doctors to real clinics
UPDATE doctors SET
    clinic_name    = 'Медицинский центр «Хаят»',
    clinic_address = 'пр. Аль-Фараби, 7, Алматы'
WHERE city = 'Алматы' AND clinic_name IS NULL
  AND id IN (SELECT id FROM doctors WHERE city = 'Алматы' ORDER BY license_number LIMIT 4);

UPDATE doctors SET
    clinic_name    = 'Клиника «Сункар»',
    clinic_address = 'ул. Достык, 210, Алматы'
WHERE city = 'Алматы' AND clinic_name IS NULL
  AND id IN (SELECT id FROM doctors WHERE city = 'Алматы' ORDER BY license_number OFFSET 4 LIMIT 4);

UPDATE doctors SET
    clinic_name    = 'ГКБ №1 Алматы',
    clinic_address = 'ул. Байзакова, 161, Алматы'
WHERE city = 'Алматы' AND clinic_name IS NULL;

-- Assign Астана doctors to real clinics
UPDATE doctors SET
    clinic_name    = 'Медикер Астана',
    clinic_address = 'ул. Достык, 13, Астана'
WHERE city = 'Астана' AND clinic_name IS NULL
  AND id IN (SELECT id FROM doctors WHERE city = 'Астана' ORDER BY license_number LIMIT 4);

UPDATE doctors SET
    clinic_name    = 'Клиника «Alatau Medical»',
    clinic_address = 'ул. Сарыарка, 47, Астана'
WHERE city = 'Астана' AND clinic_name IS NULL;

-- Fallback for any remaining doctors
UPDATE doctors SET
    clinic_name    = 'Городская поликлиника',
    clinic_address = 'ул. Абая, 52, ' || COALESCE(city, 'Алматы')
WHERE clinic_name IS NULL;
