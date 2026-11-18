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
    $("lastSync").textContent = "Mis à jour à " + new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    renderFilters();
    render();
  }
  $("refreshBtn").addEventListener("click", load);

  function statutLabel(r) {
    return r.statut === "Autre" && r.statut_autre ? "Autre : " + r.statut_autre : r.statut;
  }

  function filtered() {
    const q = $("search").value.trim().toLowerCase();
    const st = $("filterStatut").value;
    let list = rows.filter((r) => {
      if (st && r.statut !== st) return false;
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
    rows.forEach((r) => (counts[r.statut] = (counts[r.statut] || 0) + 1));
    sel.length = 1;
    window.STATUTS.forEach((s) => {
      const o = document.createElement("option");
      o.value = s;
      o.textContent = s + " (" + (counts[s] || 0) + ")";
      sel.append(o);
    });
    sel.value = current;

    const stats = $("stats");
    stats.replaceChildren();
    const total = document.createElement("span");
    total.className = "stat total";
    total.innerHTML = "<b></b> inscrits";
    total.querySelector("b").textContent = rows.length;
    stats.append(total);
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
    $("empty").textContent = rows.length
      ? "Aucune inscription ne correspond à cette recherche."
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

      const tdAct = document.createElement("td");
      const box = document.createElement("div");
      box.className = "actions";
      if (pendingDelete === r.id) {
        const yes = document.createElement("button");
        yes.className = "danger small";
        yes.textContent = "Confirmer";
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
    const head = ["Date", "Nom", "Prénom", "Téléphone", "Email", "Statut", "Statut (précision)"];
    const esc = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
    const lines = [head.map(esc).join(";")].concat(
      filtered().map((r) => [dateFmt.format(new Date(r.created_at)), r.nom, r.prenom, r.telephone,
        r.email, r.statut, r.statut_autre].map(esc).join(";"))
    );
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "inscriptions-" + new Date().toISOString().slice(0, 10) + ".csv";
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
