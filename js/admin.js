// Page admin : connexion + tableau des inscriptions
(function () {
  const { SUPABASE_URL, SUPABASE_KEY } = window.APP_CONFIG;
  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  const $ = (id) => document.getElementById(id);

  let rows = [];
  let sortKey = "created_at";
  let sortAsc = false;
  let pendingDelete = null;
  let timer = null;
  let vue = "actifs";          // "actifs" ou "corbeille"
  let corbeilleDispo = true;   // false si la colonne supprime_le n'existe pas encore

  // Suivi des appels et de la présence
  const APPEL = [
    ["a_appeler", "Pas encore appelé"],
    ["appele", "Appelé"],
    ["sans_reponse", "Pas répondu"],
  ];
  const PRESENCE = [
    ["non_confirme", "Non confirmé"],
    ["confirme", "Confirmé, il vient"],
    ["absent", "Ne vient pas"],
  ];
  const label = (liste, v) => (liste.find((x) => x[0] === v) || [v, v])[1];
  let suiviDispo = true; // false si sql/03_suivi_appels.sql n'a pas encore été exécuté

  const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" });

  // ---------- Vues ----------
  function show(view) {
    ["loginView", "tableView", "deniedView"].forEach((v) => ($(v).hidden = v !== view));
  }

  async function start() {
    const { data } = await db.auth.getSession();
    if (!data.session) return show("loginView");
    const { data: admin, error } = await db
      .from("admins").select("user_id").eq("user_id", data.session.user.id).maybeSingle();
    if (error || !admin) return show("deniedView");
    $("whoEmail").textContent = data.session.user.email;
    show("tableView");
    await load();
    clearInterval(timer);
    timer = setInterval(load, 30000); // actualisation auto toutes les 30 s
  }

  // ---------- Connexion ----------
  $("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("loginError").hidden = true;
    const email = $("loginEmail").value.trim();
    const password = $("loginPassword").value;
    if (!email || !password) {
      $("loginError").textContent = "Indiquez votre email et votre mot de passe.";
      $("loginError").hidden = false;
      return;
    }
    $("loginBtn").disabled = true;
    const { error } = await db.auth.signInWithPassword({ email, password });
    $("loginBtn").disabled = false;
    if (error) {
      $("loginError").textContent = "Email ou mot de passe incorrect.";
      $("loginError").hidden = false;
      return;
    }
    $("loginPassword").value = "";
    start();
  });

  async function logout() {
    clearInterval(timer);
    await db.auth.signOut();
    rows = [];
    show("loginView");
  }
  $("logoutBtn").addEventListener("click", logout);
  $("deniedLogout").addEventListener("click", logout);

  // ---------- Données ----------
  async function load() {
    const { data, error } = await db
      .from("inscriptions").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      $("tableError").textContent = "Impossible de charger les inscriptions. Vérifiez votre connexion puis cliquez sur Actualiser.";
      $("tableError").hidden = false;
      return;
    }
    $("tableError").hidden = true;
    rows = data || [];
    corbeilleDispo = rows.length === 0 || "supprime_le" in rows[0];
    suiviDispo = rows.length === 0 || "appel" in rows[0];
    document.querySelectorAll(".col-suivi").forEach((th) => (th.hidden = !suiviDispo));
    $("filterAppel").hidden = $("filterPresence").hidden = !suiviDispo;
    $("lastSync").textContent = "Mis à jour à " + new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    renderFilters();
    render();
  }
  $("refreshBtn").addEventListener("click", load);

  function statutLabel(r) {
    return r.statut === "Autre" && r.statut_autre ? "Autre : " + r.statut_autre : r.statut;
  }

  const actifs = () => rows.filter((r) => !r.supprime_le);
  const supprimes = () => rows.filter((r) => r.supprime_le);
  const rowsVue = () => (vue === "corbeille" ? supprimes() : actifs());

  function filtered() {
    const q = $("search").value.trim().toLowerCase();
    const st = $("filterStatut").value;
    const fa = $("filterAppel").value;
    const fp = $("filterPresence").value;
    let list = rowsVue().filter((r) => {
      if (st && r.statut !== st) return false;
      if (fa && r.appel !== fa) return false;
      if (fp && r.presence !== fp) return false;
      if (!q) return true;
      return [r.nom, r.prenom, r.telephone, r.email, r.statut, r.statut_autre]
        .filter(Boolean).join(" ").toLowerCase().includes(q);
    });
    list.sort((a, b) => {
      const x = (a[sortKey] || "").toString().toLowerCase();
      const y = (b[sortKey] || "").toString().toLowerCase();
      return (x < y ? -1 : x > y ? 1 : 0) * (sortAsc ? 1 : -1);
    });
    return list;
  }

  function renderFilters() {
    const sel = $("filterStatut");
    const current = sel.value;
    const counts = {};
    const base = rowsVue();
    base.forEach((r) => (counts[r.statut] = (counts[r.statut] || 0) + 1));
    $("countActifs").textContent = actifs().length;
    $("countCorbeille").textContent = supprimes().length;
    sel.length = 1;
    window.STATUTS.forEach((s) => {
      const o = document.createElement("option");
      o.value = s;
      o.textContent = s + " (" + (counts[s] || 0) + ")";
      sel.append(o);
    });
    sel.value = current;

    // Filtres appel / présence avec leurs compteurs
    [["filterAppel", APPEL, "appel", "Tous les appels"], ["filterPresence", PRESENCE, "presence", "Toutes les présences"]]
      .forEach(([id, liste, champ]) => {
        const f = $(id), cur = f.value;
        f.length = 1;
        liste.forEach(([v, l]) => {
          const o = document.createElement("option");
          o.value = v;
          o.textContent = l + " (" + base.filter((r) => r[champ] === v).length + ")";
          f.append(o);
        });
        f.value = cur;
      });

    const stats = $("stats");
    stats.replaceChildren();
    const total = document.createElement("span");
    total.className = "stat total";
    total.innerHTML = vue === "corbeille" ? "<b></b> dans la corbeille" : "<b></b> inscrits";
    total.querySelector("b").textContent = base.length;
    stats.append(total);
    if (suiviDispo && vue !== "corbeille") {
      [["confirme", "Confirmés", "ok"], ["absent", "Ne viennent pas", "no"]].forEach(([v, l, cls]) => {
        const el = document.createElement("span");
        el.className = "stat suivi-" + cls;
        el.innerHTML = "<span></span> · <b></b>";
        el.children[0].textContent = l;
        el.children[1].textContent = base.filter((r) => r.presence === v).length;
        stats.append(el);
      });
      const el = document.createElement("span");
      el.className = "stat suivi-todo";
      el.innerHTML = "<span>À appeler</span> · <b></b>";
      el.children[1].textContent = base.filter((r) => r.appel === "a_appeler").length;
      stats.append(el);
    }
    Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([s, n]) => {
      const el = document.createElement("span");
      el.className = "stat";
      el.innerHTML = "<span></span> · <b></b>";
      el.children[0].textContent = s;
      el.children[1].textContent = n;
      stats.append(el);
    });
  }

  function cell(text, cls) {
    const td = document.createElement("td");
    td.textContent = text;
    if (cls) td.className = cls;
    return td;
  }

  function render() {
    const tbody = $("rows");
    tbody.replaceChildren();
    const list = filtered();
    $("empty").hidden = list.length > 0;
    const corb = vue === "corbeille";
    $("thSupprime").hidden = !corb;
    $("trashNote").hidden = !corb;
    $("empty").textContent = rowsVue().length
      ? "Aucune inscription ne correspond à cette recherche."
      : corb
        ? "La corbeille est vide."
        : "Aucune inscription pour le moment. Elles apparaîtront ici dès qu'une personne remplira le formulaire.";

    list.forEach((r) => {
      const tr = document.createElement("tr");
      tr.append(
        cell(dateFmt.format(new Date(r.created_at)), "num muted"),
        cell(r.nom),
        cell(r.prenom),
        cell(r.telephone, "num"),
        cell(r.email || "—", r.email ? "" : "muted")
      );
      const tdStatut = document.createElement("td");
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = statutLabel(r);
      tdStatut.append(badge);
      tr.append(tdStatut);
      if (suiviDispo) {
        tr.append(choix(r, "appel", APPEL), choix(r, "presence", PRESENCE));
      }
      if (corb) tr.append(cell(dateFmt.format(new Date(r.supprime_le)), "num muted"));

      const tdAct = document.createElement("td");
      const box = document.createElement("div");
      box.className = "actions";
      const btn = (cls, txt, fn) => {
        const b = document.createElement("button");
        b.className = cls + " small"; b.textContent = txt; b.addEventListener("click", fn);
        return b;
      };
      if (corb && pendingDelete !== r.id) {
        box.append(
          btn("restore", "Restaurer", () => setCorbeille(r.id, null)),
          btn("ghost-danger", "Supprimer définitivement", () => { pendingDelete = r.id; render(); })
        );
      } else if (!corb && corbeilleDispo) {
        const b = btn("ghost-danger", "Supprimer", () => setCorbeille(r.id, new Date().toISOString()));
        b.title = "Mettre à la corbeille (vous pourrez la restaurer)";
        box.append(b);
      } else if (pendingDelete === r.id) {
        const yes = document.createElement("button");
        yes.className = "danger small";
        yes.textContent = corb ? "Oui, supprimer pour toujours" : "Confirmer";
        yes.addEventListener("click", () => remove(r.id));
        const no = document.createElement("button");
        no.className = "secondary small";
        no.textContent = "Annuler";
        no.addEventListener("click", () => { pendingDelete = null; render(); });
        box.append(yes, no);
      } else {
        const del = document.createElement("button");
        del.className = "ghost-danger small";
        del.textContent = "Supprimer";
        del.addEventListener("click", () => { pendingDelete = r.id; render(); });
        box.append(del);
      }
      tdAct.append(box);
      tr.append(tdAct);
      tbody.append(tr);
    });
  }

  // Liste déroulante colorée pour l'appel ou la présence
  function choix(r, champ, liste) {
    const td = document.createElement("td");
    const sel = document.createElement("select");
    sel.className = "suivi suivi-" + r[champ];
    sel.setAttribute("aria-label", (champ === "appel" ? "Appel de " : "Présence de ") + r.prenom + " " + r.nom);
    liste.forEach(([v, l]) => {
      const o = document.createElement("option");
      o.value = v; o.textContent = l;
      sel.append(o);
    });
    sel.value = r[champ];
    sel.addEventListener("change", async () => {
      const ancien = r[champ], nouveau = sel.value;
      sel.disabled = true;
      const { error } = await db.from("inscriptions").update({ [champ]: nouveau }).eq("id", r.id);
      sel.disabled = false;
      if (error) {
        console.error(error);
        sel.value = ancien;
        $("tableError").textContent = "Le changement n'a pas été enregistré. Vérifiez que le script sql/03_suivi_appels.sql a été exécuté dans Supabase, puis réessayez.";
        $("tableError").hidden = false;
        return;
      }
      $("tableError").hidden = true;
      r[champ] = nouveau;
      sel.className = "suivi suivi-" + nouveau;
      renderFilters();
      if ($("filterAppel").value || $("filterPresence").value) render();
    });
    td.append(sel);
    return td;
  }

  async function setCorbeille(id, valeur) {
    const { error } = await db.from("inscriptions").update({ supprime_le: valeur }).eq("id", id);
    if (error) {
      console.error(error);
      $("tableError").textContent = valeur
        ? "Impossible de mettre à la corbeille. Vérifiez que le script sql/02_corbeille.sql a été exécuté dans Supabase."
        : "La restauration a échoué. Réessayez.";
      $("tableError").hidden = false;
      return;
    }
    $("tableError").hidden = true;
    const r = rows.find((x) => x.id === id);
    if (r) r.supprime_le = valeur;
    renderFilters();
    render();
  }

  function changerVue(v) {
    vue = v;
    pendingDelete = null;
    $("tabActifs").setAttribute("aria-selected", v === "actifs");
    $("tabCorbeille").setAttribute("aria-selected", v === "corbeille");
    renderFilters();
    render();
  }
  $("tabActifs").addEventListener("click", () => changerVue("actifs"));
  $("tabCorbeille").addEventListener("click", () => {
    if (!corbeilleDispo) {
      $("tableError").textContent = "La corbeille n'est pas encore activée. Exécutez le script sql/02_corbeille.sql dans Supabase (SQL Editor), puis actualisez.";
      $("tableError").hidden = false;
      return;
    }
    changerVue("corbeille");
  });

  async function remove(id) {
    const { error } = await db.from("inscriptions").delete().eq("id", id);
    pendingDelete = null;
    if (error) {
      $("tableError").textContent = "La suppression a échoué. Réessayez.";
      $("tableError").hidden = false;
      return;
    }
    rows = rows.filter((r) => r.id !== id);
    renderFilters();
    render();
  }

  $("search").addEventListener("input", render);
  $("filterStatut").addEventListener("change", render);
  $("filterAppel").addEventListener("change", render);
  $("filterPresence").addEventListener("change", render);

  document.querySelectorAll("th button.sort").forEach((b) => {
    b.addEventListener("click", () => {
      const k = b.dataset.key;
      if (sortKey === k) sortAsc = !sortAsc;
      else { sortKey = k; sortAsc = k !== "created_at"; }
      document.querySelectorAll("th button.sort").forEach((x) => (x.textContent = x.textContent.replace(/ [↑↓]$/, "")));
      b.textContent += sortAsc ? " ↑" : " ↓";
      render();
    });
  });

  // ---------- Export CSV (s'ouvre dans Excel) ----------
  $("exportBtn").addEventListener("click", () => {
    const head = ["Date", "Nom", "Prénom", "Téléphone", "Email", "Statut", "Statut (précision)", "Appel", "Présence"];
    const esc = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
    const lines = [head.map(esc).join(";")].concat(
      filtered().map((r) => [dateFmt.format(new Date(r.created_at)), r.nom, r.prenom, r.telephone,
        r.email, r.statut, r.statut_autre,
        r.appel ? label(APPEL, r.appel) : "", r.presence ? label(PRESENCE, r.presence) : ""].map(esc).join(";"))
    );
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (vue === "corbeille" ? "corbeille-" : "inscriptions-") + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  db.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") show("loginView");
  });

  start();
})();
