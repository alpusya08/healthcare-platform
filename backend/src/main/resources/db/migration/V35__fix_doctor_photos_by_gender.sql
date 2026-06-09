-- ═══════════════════════════════════════════════════════════════
-- V35: Assign gender-appropriate photos to all doctors
-- Male doctors  → professional male headshots
-- Female doctors → professional female headshots
-- ═══════════════════════════════════════════════════════════════

-- ── MALE DOCTORS ────────────────────────────────────────────────

-- Алтынбек Сейткали (Кардиолог)
UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80'
WHERE id = (SELECT id FROM users WHERE email = 'dr.seitkali@medai.kz');

-- Мухамед Досов (Невролог)
UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?w=400&q=80'
WHERE id = (SELECT id FROM users WHERE email = 'dr.dosov@medai.kz');

-- Дамир Ахметов (Невролог)
UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&q=80'
WHERE id = (SELECT id FROM users WHERE email = 'dr.neuro@medai.kz');

-- abenov (Мужчина)
UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&q=80'
WHERE id = (SELECT id FROM users WHERE email = 'dr.abenov@medai.kz');

-- rakhimov (Мужчина)
UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&q=80'
WHERE id = (SELECT id FROM users WHERE email = 'dr.rakhimov@medai.kz');

-- kaliyev (Мужчина)
UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1681896791046-cd3e3db2acde?w=400&q=80'
WHERE id = (SELECT id FROM users WHERE email = 'dr.kaliyev@medai.kz');

-- Бауыржан Омаров (Ортопед) — fix: was assigned female photo in V24
UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&q=80'
WHERE id = (SELECT id FROM users WHERE email = 'dr.orto@medai.kz');

-- Нурлан Демо (Кардиолог, demo account)
UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80'
WHERE id = (SELECT id FROM users WHERE email = 'demo@doctor.com');

-- Бауыржан Омаров (Терапевт, baurzhan demo)
UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1571772996211-2f02c9727629?w=400&q=80'
WHERE id = (SELECT id FROM users WHERE email = 'baurzhan@demo.com');

-- Арман Джаксыбеков (Дерматолог)
UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400&q=80'
WHERE id = (SELECT id FROM users WHERE email = 'dr.derm2@medai.kz');

-- Болат Нурмаганбетов (Эндокринолог)
UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1593085512500-5d55148d6f0d?w=400&q=80'
WHERE id = (SELECT id FROM users WHERE email = 'dr.endo2@medai.kz');

-- Серик Байжанов (Гастроэнтеролог)
UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1603796846097-bee99e4a601f?w=400&q=80'
WHERE id = (SELECT id FROM users WHERE email = 'dr.gastro2@medai.kz');

-- Руслан Кенжебаев (Ортопед)
UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1666214280429-5c2a8c680082?w=400&q=80'
WHERE id = (SELECT id FROM users WHERE email = 'dr.ortho2@medai.kz');

-- Асхат Жумабеков (Пульмонолог)
UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400&q=80'
WHERE id = (SELECT id FROM users WHERE email = 'dr.pulmo2@medai.kz');

-- Нурлан Абдрахманов (Хирург)
UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1612531386530-97286d97c2d2?w=400&q=80'
WHERE id = (SELECT id FROM users WHERE email = 'dr.surg1@medai.kz');

-- Берик Сатыбалдиев (Хирург)
UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1614608682850-e0d6ed316d47?w=400&q=80'
WHERE id = (SELECT id FROM users WHERE email = 'dr.surg2@medai.kz');

-- Айбек Мусаев (ЛОР)
UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1682562163503-34a0e1be5b63?w=400&q=80'
WHERE id = (SELECT id FROM users WHERE email = 'dr.lor1@medai.kz');

-- Тимур Сагиндыков (ЛОР)
UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1681896791046-cd3e3db2acde?w=400&q=80'
WHERE id = (SELECT id FROM users WHERE email = 'dr.lor3@medai.kz');

-- ── FEMALE DOCTORS ───────────────────────────────────────────────

-- Асель Жакупова (Терапевт)
UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&q=80'
WHERE id = (SELECT id FROM users WHERE email = 'dr.zhakupova@medai.kz');

-- Айдана Рысбекова (Пульмонолог)
UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=400&q=80'
WHERE id = (SELECT id FROM users WHERE email = 'dr.pulmo@medai.kz');

-- bekova (Женщина)
UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1527613426441-4da17471b66d?w=400&q=80'
WHERE id = (SELECT id FROM users WHERE email = 'dr.bekova@medai.kz');

-- nurova (Женщина)
UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1638202993928-7267aad84c31?w=400&q=80'
WHERE id = (SELECT id FROM users WHERE email = 'dr.nurova@medai.kz');

-- smagulova (Женщина)
UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=400&q=80'
WHERE id = (SELECT id FROM users WHERE email = 'dr.smagulova@medai.kz');

-- Мадина Сейткали (Гастроэнтеролог) — fix: was assigned male photo in V24
UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&q=80'
WHERE id = (SELECT id FROM users WHERE email = 'dr.seitkali2@medai.kz');

-- Назгуль Ахметова (Дерматолог)
UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1643297654416-05795d62e39c?w=400&q=80'
WHERE id = (SELECT id FROM users WHERE email = 'dr.derm3@medai.kz');

-- Жания Сейткали (Эндокринолог)
UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=400&q=80'
WHERE id = (SELECT id FROM users WHERE email = 'dr.endo3@medai.kz');

-- Дина Карибаева (Гастроэнтеролог)
UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1622902046580-2b47f47f5471?w=400&q=80'
WHERE id = (SELECT id FROM users WHERE email = 'dr.gastro3@medai.kz');

-- Камила Тулегенова (Ортопед)
UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1618498082410-b4aa22193b38?w=400&q=80'
WHERE id = (SELECT id FROM users WHERE email = 'dr.ortho3@medai.kz');

-- Гаухар Исабекова (Пульмонолог)
UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=400&q=80'
WHERE id = (SELECT id FROM users WHERE email = 'dr.pulmo3@medai.kz');

-- Светлана Козлова (Хирург)
UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&q=80'
WHERE id = (SELECT id FROM users WHERE email = 'dr.surg3@medai.kz');

-- Гульмира Алтынбекова (ЛОР)
UPDATE doctors SET photo_url = 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=400&q=80'
WHERE id = (SELECT id FROM users WHERE email = 'dr.lor2@medai.kz');
