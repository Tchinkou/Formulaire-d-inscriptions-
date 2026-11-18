// Page publique : envoi d'une inscription vers Supabase
(function () {
  const { SUPABASE_URL, SUPABASE_KEY } = window.APP_CONFIG;
  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  });
  const $ = (id) => document.getElementById(id);
  const FIELDS = ["nom", "prenom", "telephone", "email", "statut", "statut_autre"];

  // Boutons de statut
  const chips = $("statuts");
  window.STATUTS.forEach((s, i) => {
    const label = document.createElement("label");
    label.className = "chip";
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "statut";
    input.id = "statut-" + i;
    input.value = s;
    const span = document.createElement("span");
    span.textContent = s;
    label.append(input, span);
    chips.append(label);

    input.addEventListener("change", () => {
      const autre = input.value === "Autre";
      $("autreWrap").hidden = !autre;
      if (autre) $("statut_autre").focus();
      setErr("statut", "");
    });
  });

  function setErr(field, msg) {
    const el = $(field + "-err");
    if (el) el.textContent = msg;
    const input = $(field);
    if (input) input.setAttribute("aria-invalid", msg ? "true" : "false");
  }

  // Efface le message d'erreur dès que la personne corrige le champ
  ["nom", "prenom", "telephone", "email", "statut_autre"].forEach((f) =>
    $(f).addEventListener("input", () => setErr(f, ""))
  );

  function readForm() {
    const checked = document.querySelector("input[name=statut]:checked");
    return {
      nom: $("nom").value.trim(),
      prenom: $("prenom").value.trim(),
      telephone: $("telephone").value.trim().replace(/\s+/g, " "),
      email: $("email").value.trim(),
      statut: checked ? checked.value : "",
      statut_autre: $("statut_autre").value.trim(),
    };
  }

  function validate(v) {
    let ok = true;
    const fail = (f, m) => { setErr(f, m); ok = false; };
    FIELDS.forEach((f) => setErr(f, ""));

    if (!v.nom) fail("nom", "Indiquez votre nom.");
    if (!v.prenom) fail("prenom", "Indiquez votre prénom.");

    const digits = v.telephone.replace(/\D/g, "");
    if (!v.telephone) fail("telephone", "Indiquez votre numéro de téléphone.");
    else if (!/^[0-9 +().-]+$/.test(v.telephone) || digits.length < 8 || digits.length > 15)
      fail("telephone", "Ce numéro n'est pas valide. Exemple : 0555 12 34 56.");

    if (v.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email))
      fail("email", "Cette adresse email n'est pas valide.");

    if (!v.statut) fail("statut", "Choisissez votre statut.");
    if (v.statut === "Autre" && !v.statut_autre) fail("statut_autre", "Précisez votre statut.");
    return ok;
  }

  function setBusy(busy) {
    $("submit").disabled = busy;
    $("submit").textContent = busy ? "Envoi en cours…" : "Envoyer mon inscription";
  }

  $("form").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("formError").hidden = true;
    const v = readForm();
    if (!validate(v)) {
      const first = document.querySelector("[aria-invalid=true]") ||
        (!v.statut && document.querySelector("input[name=statut]"));
      if (first) first.focus();
      return;
    }

    setBusy(true);
    const { error } = await db.from("inscriptions").insert({
      nom: v.nom,
      prenom: v.prenom,
      telephone: v.telephone,
      email: v.email || null,
      statut: v.statut,
      statut_autre: v.statut === "Autre" ? v.statut_autre : null,
    });
    setBusy(false);

    if (error) {
      console.error(error);
      $("formError").textContent =
        "L'inscription n'a pas pu être envoyée. Vérifiez votre connexion internet puis réessayez.";
      $("formError").hidden = false;
      return;
    }

    $("doneText").textContent = "Merci " + v.prenom + ", votre inscription a bien été reçue.";
    $("formView").hidden = true;
    $("doneView").hidden = false;
  });

  $("again").addEventListener("click", () => {
    $("form").reset();
    FIELDS.forEach((f) => setErr(f, ""));
    $("autreWrap").hidden = true;
    $("doneView").hidden = true;
    $("formView").hidden = false;
    $("nom").focus();
  });
})();
