// Génère l'invitation personnalisée (image PNG 1080 x 1350) dans un <canvas>
window.genererInvitation = (function () {
  const W = 1080, H = 1350;
  const C = {
    forest: "#0e3b1c", forest2: "#164d26", gold: "#d4a12a", goldLight: "#f0c95a",
    cream: "#fbf6e8", ink: "#16261a", muted: "#5b6b5e",
  };
  const DISPLAY = '"Anton", Impact, "Arial Narrow", sans-serif';
  const COND = '"Roboto Condensed", "Arial Narrow", Arial, sans-serif';
  const BODY = '"Inter", Arial, sans-serif';

  function loadImg(src) {
    return new Promise((res) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => res(null);
      i.src = src;
    });
  }

  async function fontsReady() {
    if (!document.fonts) return;
    try {
      await Promise.all([
        document.fonts.load('80px "Anton"'),
        document.fonts.load('700 40px "Roboto Condensed"'),
        document.fonts.load('500 30px "Inter"'),
      ]);
    } catch (e) { /* polices de secours */ }
  }

  // Réduit la taille du texte jusqu'à ce qu'il tienne dans maxW
  function fitText(ctx, text, maxW, size, weight, family) {
    let s = size;
    do { ctx.font = `${weight} ${s}px ${family}`; s -= 2; } while (ctx.measureText(text).width > maxW && s > 24);
    return s + 2;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function goldRule(ctx, cx, y, half) {
    const g = ctx.createLinearGradient(cx - half, 0, cx + half, 0);
    g.addColorStop(0, "rgba(212,161,42,0)");
    g.addColorStop(.5, C.gold);
    g.addColorStop(1, "rgba(212,161,42,0)");
    ctx.fillStyle = g;
    ctx.fillRect(cx - half, y, half * 2, 3);
  }

  return async function (canvas, p) {
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    await fontsReady();
    const [logo, bulb] = await Promise.all([loadImg("img/logo-agritech.png"), loadImg("img/ampoule.jpg")]);
    const cx = W / 2;

    // Fond crème + cadre doré
    ctx.fillStyle = C.cream; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = C.gold; ctx.lineWidth = 6; roundRect(ctx, 28, 28, W - 56, H - 56, 28); ctx.stroke();
    ctx.lineWidth = 2; roundRect(ctx, 44, 44, W - 88, H - 88, 20); ctx.stroke();

    // Bandeau vert du haut
    ctx.save();
    roundRect(ctx, 44, 44, W - 88, 420, 20); ctx.clip();
    const bg = ctx.createLinearGradient(0, 44, 0, 464);
    bg.addColorStop(0, C.forest2); bg.addColorStop(1, C.forest);
    ctx.fillStyle = bg; ctx.fillRect(44, 44, W - 88, 420);
    if (bulb) { // image de l'ampoule en fondu à droite
      ctx.globalAlpha = .35;
      ctx.drawImage(bulb, W - 470, 44, 430, 430 * (bulb.height / bulb.width));
      ctx.globalAlpha = 1;
      const fade = ctx.createLinearGradient(W - 520, 0, W - 260, 0);
      fade.addColorStop(0, C.forest); fade.addColorStop(1, "rgba(14,59,28,0)");
      ctx.fillStyle = fade; ctx.fillRect(W - 520, 44, 300, 420);
    }
    ctx.restore();

    // Logo dans un écusson crème
    if (logo) {
      const lh = 150, lw = lh * (logo.width / logo.height);
      ctx.fillStyle = C.cream; ctx.strokeStyle = C.gold; ctx.lineWidth = 4;
      roundRect(ctx, cx - lw / 2 - 20, 44, lw + 40, lh + 26, 26); ctx.fill(); ctx.stroke();
      ctx.drawImage(logo, cx - lw / 2, 52, lw, lh);
    }

    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = C.goldLight; ctx.font = `700 34px ${COND}`;
    ctx.letterSpacing = "6px";
    ctx.fillText("INVITATION PERSONNELLE", cx, 286);
    ctx.letterSpacing = "0px";
    ctx.fillStyle = "#ffffff";
    ctx.font = `400 64px ${DISPLAY}`;
    ctx.fillText("FORMATION EN ENTREPRENEURIAT", cx, 370, W - 160);
    ctx.fillStyle = C.gold; ctx.font = `700 30px ${COND}`;
    ctx.fillText("Innover · Entreprendre · Réussir", cx, 420);

    // Corps : nom de l'invité
    ctx.fillStyle = C.muted; ctx.font = `500 30px ${BODY}`;
    ctx.fillText("Le club AGRITECH a le plaisir d'inviter", cx, 540);

    const nomComplet = `${p.prenom} ${p.nom.toUpperCase()}`;
    const size = fitText(ctx, nomComplet, W - 200, 92, 400, DISPLAY);
    ctx.font = `400 ${size}px ${DISPLAY}`;
    ctx.fillStyle = C.forest;
    ctx.fillText(nomComplet, cx, 650);
    goldRule(ctx, cx, 680, 300);

    if (p.statutLabel) {
      ctx.fillStyle = C.muted; ctx.font = `700 30px ${COND}`;
      ctx.fillText(p.statutLabel, cx, 730, W - 200);
    }

    ctx.fillStyle = C.ink; ctx.font = `500 30px ${BODY}`;
    ctx.fillText("à participer à la formation en entrepreneuriat", cx, 800);
    ctx.fillText("assurée par", cx, 845);
    ctx.fillStyle = C.forest; ctx.font = `700 44px ${COND}`;
    ctx.fillText("le Dr Zidelkhil.H", cx, 900);

    // Trois pastilles : lieu, date, heure
    const facts = [["LIEU", "Lac Mezaia"], ["DATE", "Samedi 21/11/2026"], ["HEURE", "À partir de 09h00"]];
    const bw = 300, gap = 24, total = bw * 3 + gap * 2, y0 = 960;
    facts.forEach(([k, v], i) => {
      const x = cx - total / 2 + i * (bw + gap);
      ctx.fillStyle = C.forest; roundRect(ctx, x, y0, bw, 120, 18); ctx.fill();
      ctx.fillStyle = C.gold; ctx.fillRect(x + 30, y0 + 116, bw - 60, 4);
      ctx.fillStyle = C.gold; ctx.font = `700 24px ${COND}`;
      ctx.letterSpacing = "3px"; ctx.fillText(k, x + bw / 2, y0 + 46); ctx.letterSpacing = "0px";
      ctx.fillStyle = "#ffffff"; ctx.font = `700 32px ${COND}`;
      ctx.fillText(v, x + bw / 2, y0 + 90, bw - 24);
    });

    // Bandeau du bas
    ctx.fillStyle = C.forest; roundRect(ctx, 44, H - 210, W - 88, 166, 20); ctx.fill();
    ctx.fillStyle = C.gold; ctx.fillRect(44, H - 210, W - 88, 4);
    ctx.fillStyle = "#ffffff"; ctx.font = `400 46px ${DISPLAY}`;
    ctx.fillText("UNE IDÉE AUJOURD'HUI,", cx, H - 140);
    ctx.fillStyle = C.gold;
    ctx.fillText("UNE RÉUSSITE DEMAIN !", cx, H - 84);

    return canvas;
  };
})();
