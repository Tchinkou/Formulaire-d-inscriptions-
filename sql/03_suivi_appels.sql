-- =====================================================================
-- Suivi des appels et de la présence : à exécuter UNE fois
-- dans Supabase > SQL Editor > Run
-- =====================================================================
alter table public.inscriptions
  add column if not exists appel text not null default 'a_appeler'
    check (appel in ('a_appeler', 'appele', 'sans_reponse')),
  add column if not exists presence text not null default 'non_confirme'
    check (presence in ('non_confirme', 'confirme', 'absent'));

-- Les admins peuvent modifier ces deux colonnes (et la corbeille)
grant update (appel, presence, supprime_le) on public.inscriptions to authenticated;

drop policy if exists inscriptions_maj_admin on public.inscriptions;
create policy inscriptions_maj_admin on public.inscriptions
  for update to authenticated using (public.est_admin()) with check (public.est_admin());
