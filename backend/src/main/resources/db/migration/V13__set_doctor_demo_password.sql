-- Set known password for demo doctor: Doctor1234!
-- dr.seitkali@medai.kz is the primary demo doctor (Кардиолог)
UPDATE users
SET password_hash = '$2a$12$IP/S.HE6YxBJmQl6k.meX.8GIVNuixvGUxMC0ZvCwwUgWjbk3pv02',
    updated_at    = NOW()
WHERE email = 'dr.seitkali@medai.kz';
