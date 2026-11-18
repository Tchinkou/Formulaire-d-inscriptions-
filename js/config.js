// Configuration Supabase
// Remplace ces deux valeurs par celles de ton projet :
// Supabase > Project Settings > API (ou bouton "Connect")
//   - Project URL           -> SUPABASE_URL
//   - Publishable key (ou "anon public") -> SUPABASE_KEY
// Cette clé est publique : avec les règles du fichier sql/schema.sql,
// elle permet seulement d'ajouter une inscription, pas de lire la liste.
window.APP_CONFIG = {
  SUPABASE_URL: "https://qkktkukjxmwdlnufuzcv.supabase.co",
  SUPABASE_KEY: "sb_publishable_K0dsZ4YYiIcTJxC5L4-v0Q_8PNBZmPd",
};

// Liste des statuts proposés. Si tu la modifies, modifie aussi la liste
// dans sql/schema.sql (contrainte "statut in (...)").
window.STATUTS = [
  "Universitaire", "Étudiant", "Fonctionnaire", "Professeur", "Enseignant",
  "Agriculteur", "Commerçant", "Artisan", "Profession libérale",
  "Sans emploi", "Retraité", "Autre",
];
