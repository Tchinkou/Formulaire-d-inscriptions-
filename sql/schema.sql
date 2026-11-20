-- =====================================================================
-- Formulaire d'inscription : schéma Supabase
-- À exécuter une fois dans Supabase > SQL Editor > New query > Run
-- =====================================================================

-- 1. Table des inscriptions -------------------------------------------
create table if not exists public.inscriptions (
  id            uuid primary key default gen_random_uuid(),
  nom           text not null check (char_length(btrim(nom)) between 1 and 100),
  prenom        text not null check (char_length(btrim(prenom)) between 1 and 100),
  telephone     text not null check (telephone ~ '^[0-9 +().-]{8,20}$'),
  email         text check (email is null or (char_length(email) <= 200 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  statut        text not null check (statut in (
                  'Universitaire','Étudiant','Fonctionnaire','Professeur','Enseignant',
                  'Agriculteur','Commerçant','Artisan','Profession libérale',
                  'Sans emploi','Retraité','Autre')),
  statut_autre  text check (statut_autre is null or char_length(statut_autre) <= 100),
  created_at    timestamptz not null default now(),
  supprime_le   timestamptz,            -- rempli quand l'inscription est mise à la corbeille
  appel         text not null default 'a_appeler'
                check (appel in ('a_appeler', 'appele', 'sans_reponse')),
  presence      text not null default 'non_confirme'
                check (presence in ('non_confirme', 'confirme', 'absent')),
  constraint statut_autre_requis
    check (statut <> 'Autre' or (statut_autre is not null and char_length(btrim(statut_autre)) > 0))
);

create index if not exists inscriptions_created_at_idx on public.inscriptions (created_at desc);

-- 2. Liste des administrateurs autorisés à voir le tableau -------------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Fonction utilisée par les règles de sécurité
create or replace function public.est_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.est_admin() from public;
grant execute on function public.est_admin() to anon, authenticated;

-- 3. Sécurité (Row Level Security) -------------------------------------
alter table public.inscriptions enable row level security;
alter table public.admins       enable row level security;

revoke all on public.inscriptions from anon, authenticated;
revoke all on public.admins       from anon, authenticated;

-- Tout le monde peut s'inscrire (ajouter une ligne), personne ne peut lire sans être admin
grant insert on public.inscriptions to anon, authenticated;
grant select, delete on public.inscriptions to authenticated;
grant update (appel, presence, supprime_le) on public.inscriptions to authenticated;
grant select on public.admins to authenticated;

drop policy if exists inscriptions_ajout_public  on public.inscriptions;
drop policy if exists inscriptions_lecture_admin on public.inscriptions;
drop policy if exists inscriptions_suppr_admin   on public.inscriptions;
drop policy if exists inscriptions_maj_admin     on public.inscriptions;
drop policy if exists admins_lecture_soi         on public.admins;

create policy inscriptions_ajout_public on public.inscriptions
  for insert to anon, authenticated with check (true);

create policy inscriptions_lecture_admin on public.inscriptions
  for select to authenticated using (public.est_admin());

create policy inscriptions_suppr_admin on public.inscriptions
  for delete to authenticated using (public.est_admin());

-- Mise à la corbeille / restauration (colonne supprime_le)
create policy inscriptions_maj_admin on public.inscriptions
  for update to authenticated using (public.est_admin()) with check (public.est_admin());

-- Un utilisateur connecté peut seulement vérifier s'il est lui-même admin
create policy admins_lecture_soi on public.admins
  for select to authenticated using (user_id = auth.uid());

-- =====================================================================
-- 4. Te donner l'accès au tableau (à faire APRÈS avoir créé ton compte)
--    Supabase > Authentication > Users > Add user (email + mot de passe)
--    puis remplace l'email ci-dessous et exécute ces 2 lignes :
-- =====================================================================
-- insert into public.admins (user_id)
-- select id from auth.users where email = 'ton-email@exemple.com';
