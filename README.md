# Formulaire d'inscription (Supabase)

Deux pages web statiques :

- `index.html` : le formulaire public (nom, prénom, téléphone, email facultatif, statut).
- `admin.html` : le tableau des inscrits, protégé par un mot de passe (recherche, filtre par statut, tri, suppression, export CSV pour Excel).

```
index.html          formulaire public
admin.html          tableau des inscrits
css/style.css       styles communs
js/config.js        URL et clé Supabase + liste des statuts  <- à modifier
js/inscription.js   logique du formulaire
js/admin.js         logique du tableau
sql/schema.sql      tables et règles de sécurité Supabase
sql/02_corbeille.sql  ajout de la corbeille (bases existantes)
sql/03_suivi_appels.sql  suivi des appels et de la présence (bases existantes)
```

## Installation

### 1. Base de données Supabase
1. Crée un projet sur supabase.com.
2. Ouvre **SQL Editor > New query**, colle tout le contenu de `sql/schema.sql`, puis clique sur **Run**.

### 2. Ton compte administrateur
1. **Authentication > Users > Add user > Create new user** : saisis ton email et un mot de passe, coche *Auto Confirm User*.
2. Dans **SQL Editor**, exécute (avec ton email) :
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'ton-email@exemple.com';
   ```
3. Conseillé : **Authentication > Sign In / Providers > Email**, désactive *Allow new users to sign up*. Seuls les comptes que tu crées pourront se connecter.

### 3. Relier les pages à ta base
Dans **Project Settings > API** (ou le bouton **Connect**), copie la *Project URL* et la *Publishable key* (ou *anon public*), puis colle-les dans `js/config.js`.

Cette clé est publique et peut être dans le dépôt GitHub : les règles de sécurité ne lui permettent que d'ajouter une inscription. Ne mets jamais la clé *secret* ou *service_role* dans ces fichiers.

### 4. Mise en ligne avec GitHub Pages
1. Pousse ces fichiers à la racine de ton dépôt.
2. **Settings > Pages > Build and deployment** : Source *Deploy from a branch*, branche `main`, dossier `/ (root)`.
3. Après une minute :
   - formulaire : `https://<ton-compte>.github.io/<depot>/`
   - tableau : `https://<ton-compte>.github.io/<depot>/admin.html`

## Corbeille
Dans le tableau, « Mettre à la corbeille » déplace une inscription dans l'onglet **Corbeille**, d'où on peut la restaurer ou la supprimer définitivement.
Si ta base a été créée avant cette fonction, exécute une fois `sql/02_corbeille.sql` dans **SQL Editor**.

## Suivi des appels et de la présence
Deux colonnes du tableau permettent de noter, pour chaque inscrit, l'appel (pas encore appelé, appelé, pas répondu) et la présence (non confirmé, confirmé, ne vient pas). Si ta base a été créée avant cette fonction, exécute une fois `sql/03_suivi_appels.sql` dans **SQL Editor**.

## Modifier la liste des statuts
Change la liste dans `js/config.js` **et** dans `sql/schema.sql` (contrainte `statut in (...)`), puis réexécute dans Supabase :
```sql
alter table public.inscriptions drop constraint inscriptions_statut_check;
alter table public.inscriptions add constraint inscriptions_statut_check
  check (statut in ('Universitaire', 'Autre' /* ... ta nouvelle liste ... */));
```

## Tester en local
Ouvre `index.html` directement dans le navigateur, ou lance `python3 -m http.server` dans le dossier puis va sur http://localhost:8000.
