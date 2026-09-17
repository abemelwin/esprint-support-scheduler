-- ============================================================
-- Migration: Update Branch Notes to Specific Provinces (Lalawigan)
-- ES Print Support Scheduler
-- ============================================================

UPDATE public.branches SET note = 'Negros Occidental' WHERE name = 'BAC';
UPDATE public.branches SET note = 'Bukidnon'          WHERE name = 'BUK';
UPDATE public.branches SET note = 'Agusan del Norte'  WHERE name = 'BUT';
UPDATE public.branches SET note = 'Nueva Ecija'       WHERE name = 'CAB';
UPDATE public.branches SET note = 'Camarines Sur'     WHERE name = 'CAMSUR';
UPDATE public.branches SET note = 'Cavite'            WHERE name = 'CAV';
UPDATE public.branches SET note = 'Misamis Oriental'  WHERE name = 'CDO';
UPDATE public.branches SET note = 'Cebu'              WHERE name = 'CEB';
UPDATE public.branches SET note = 'Davao del Sur'     WHERE name = 'DAV';
UPDATE public.branches SET note = 'South Cotabato'    WHERE name = 'GENSAN';
UPDATE public.branches SET note = 'Iloilo'            WHERE name = 'ILO';
UPDATE public.branches SET note = 'Isabela'           WHERE name = 'ISA';
UPDATE public.branches SET note = 'Metro Manila'      WHERE name = 'MAK';
UPDATE public.branches SET note = 'Zamboanga del Sur' WHERE name = 'PAG';
UPDATE public.branches SET note = 'Palawan'           WHERE name = 'PAL';
UPDATE public.branches SET note = 'Pangasinan'        WHERE name = 'PANG';
UPDATE public.branches SET note = 'Rizal'             WHERE name = 'RIZ';
UPDATE public.branches SET note = 'Leyte'             WHERE name = 'TAC';
UPDATE public.branches SET note = 'Davao del Norte'   WHERE name = 'TAG';
UPDATE public.branches SET note = 'Zamboanga del Sur' WHERE name = 'ZAM';
