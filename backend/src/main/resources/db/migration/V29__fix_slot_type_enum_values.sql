-- Fix SlotType enum mismatch: rename ONLINE_ONLY/OFFLINE_ONLY to ONLINE/OFFLINE
-- to match values inserted by seed migrations (V24, V28)
UPDATE time_slots SET appointment_type = 'ONLINE'  WHERE appointment_type = 'ONLINE_ONLY';
UPDATE time_slots SET appointment_type = 'OFFLINE' WHERE appointment_type = 'OFFLINE_ONLY';
