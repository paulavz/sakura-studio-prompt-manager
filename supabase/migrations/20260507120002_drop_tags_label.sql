-- ============================================================================
-- Migration: Phase 8 Batch 4 — Drop dead tags.label column
-- Column was written on insert but never updated on rename and never read by UI.
-- ============================================================================

alter table public.tags drop column if exists label;
