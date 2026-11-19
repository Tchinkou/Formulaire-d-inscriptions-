-- =====================================================================
-- Corbeille : à exécuter UNE fois dans Supabase > SQL Editor > Run
-- (si ta base a été créée avec l'ancien schema.sql)
-- =====================================================================
alter table public.inscriptions add column if not exists supprime_le timestamptz;

-- Les admins peuvent mettre une inscription à la corbeille ou la restaurer
grant update (supprime_le) on public.inscriptions to authenticated;

drop policy if exists inscriptions_maj_admin on public.inscriptions;
create policy inscriptions_maj_admin on public.inscriptions
  for update to authenticated using (public.est_admin()) with check (public.est_admin());
