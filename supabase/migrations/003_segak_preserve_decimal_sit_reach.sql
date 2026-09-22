-- Preserve 0.5 cm values from the legacy SEGAK sheet.
-- SEGAK-only tables; Portal Koku tables are not altered.
alter table public.segak_records
  alter column sit_reach_cm type numeric(5,1) using sit_reach_cm::numeric(5,1);
alter table public.segak_legacy_staging
  alter column sit_reach_cm type numeric(5,1) using sit_reach_cm::numeric(5,1);
