// CineTrack — page behaviour. No dependencies, no tracking.

// Set this to the App Store link once the app is live, e.g.
// "https://apps.apple.com/app/id0000000000". While it is empty, the
// download buttons open the launch-list form instead.
const APP_STORE_URL = "";
const BETA_EMAIL = "hello@cinetrackapp.com";

// The season's dates come from the same manifest the app reads, so the
// countdown follows the data repo. The copy below is used if that fails.
const MANIFEST_URL = "https://raw.githubusercontent.com/afonsosalcedo/cinetrack-data/main/manifest.json";
const FALLBACK_SEASON = {
  shortlistDate: "2026-12-15T09:00:00-08:00",
  nominationsDate: "2027-01-21T05:30:00-08:00",
  ceremonyDate: "2027-03-14T16:00:00-07:00",
};

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

/* ---------- Split-flap tiles ---------- */

const REEL = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function makeFlap(char = " ") {
  const flap = document.createElement("div");
  flap.className = "flap";
  const glyph = document.createElement("span");
  glyph.textContent = char;
  flap.append(glyph);
  flap.dataset.char = char;
  return flap;
}

// Turn one tile to `target`, stepping through the reel like the real thing.
function turnFlap(flap, target, delay = 0) {
  const glyph = flap.firstChild;
  clearTimeout(flap.timer);
  if (reduceMotion || !REEL.includes(target)) {
    glyph.textContent = target;
    flap.dataset.char = target;
    return;
  }
  const step = () => {
    const current = flap.dataset.char;
    if (current === target) return;
    const next = REEL[(REEL.indexOf(current) + 1) % REEL.length];
    flap.dataset.char = next;
    glyph.textContent = next;
    flap.classList.remove("tick");
    void flap.offsetWidth;
    flap.classList.add("tick");
    flap.timer = setTimeout(step, 38);
  };
  flap.timer = setTimeout(step, delay);
}

/* ---------- Hero board ---------- */

function heroBoard() {
  const board = $("[data-board]");
  if (!board) return;
  const cols = 10;
  const lines = [
    ["WELCOME TO", "CINETRACK"],
    ["WATCH", "EVERYTHING"],
    ["CALL THE", "WINNERS"],
    ["BEAT YOUR", "FRIENDS"],
  ];
  const flaps = [];
  for (let i = 0; i < cols * 2; i += 1) {
    const flap = makeFlap(" ");
    if (i >= cols) flap.classList.add("gold");
    board.append(flap);
    flaps.push(flap);
  }
  const centre = (text) => {
    const left = Math.floor((cols - text.length) / 2);
    return (" ".repeat(left) + text).padEnd(cols, " ");
  };
  const show = (pair) => {
    const text = centre(pair[0]) + centre(pair[1]);
    flaps.forEach((flap, i) => {
      flap.classList.toggle("blank", text[i] === " ");
      turnFlap(flap, text[i], (i % cols) * 45 + (i >= cols ? 160 : 0));
    });
  };
  let index = 0;
  show(lines[0]);
  if (reduceMotion) { show(lines[1]); return; }
  let timer = null;
  const next = () => { index = (index + 1) % lines.length; show(lines[index]); };
  const start = () => { if (!timer) timer = setInterval(next, 3800); };
  const stop = () => { clearInterval(timer); timer = null; };
  // Only run while the board is on screen and the tab is visible.
  new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop())).observe(board);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
}

/* ---------- Countdown ---------- */

function nextMilestone(season, now) {
  const steps = [
    ["Shortlists announced in", season.shortlistDate],
    ["Nominations announced in", season.nominationsDate],
    ["Ceremony starts in", season.ceremonyDate],
  ];
  for (const [label, iso] of steps) {
    const date = iso ? new Date(iso) : null;
    if (date && date > now) return { label, date };
  }
  return null;
}

async function countdown() {
  const box = $("[data-countdown]");
  if (!box) return;
  let season = FALLBACK_SEASON;
  try {
    const response = await fetch(MANIFEST_URL, { cache: "no-cache" });
    if (response.ok) {
      const manifest = await response.json();
      const upcoming = manifest.years
        .filter((year) => year.ceremonyDate && new Date(year.ceremonyDate) > new Date())
        .sort((a, b) => new Date(a.ceremonyDate) - new Date(b.ceremonyDate))[0];
      if (upcoming) season = upcoming;
    }
  } catch { /* offline or blocked: the fallback dates are fine */ }

  const milestone = nextMilestone(season, new Date());
  if (!milestone) return; // between seasons: leave the countdown hidden

  $(".label", box).textContent = milestone.label;
  const units = $(".units", box);
  const pairs = {};
  for (const [key, name] of [["d", "days"], ["h", "hours"], ["m", "min"], ["s", "sec"]]) {
    const unit = document.createElement("div");
    unit.className = "unit";
    const pair = document.createElement("div");
    pair.className = "pair";
    pairs[key] = [makeFlap("0"), makeFlap("0")];
    if (key === "d") pairs[key].unshift(makeFlap("0"));
    pair.append(...pairs[key]);
    const small = document.createElement("small");
    small.textContent = name;
    unit.append(pair, small);
    units.append(unit);
  }
  const set = (flaps, value) => {
    const text = String(value).padStart(flaps.length, "0").slice(-flaps.length);
    flaps.forEach((flap, i) => {
      if (flap.dataset.char === text[i]) return;
      flap.dataset.char = text[i];
      flap.firstChild.textContent = text[i];
      if (!reduceMotion) { flap.classList.remove("tick"); void flap.offsetWidth; flap.classList.add("tick"); }
    });
  };
  const sr = $(".sr-only", box);
  const tick = () => {
    const left = Math.max(0, milestone.date - new Date());
    const days = Math.floor(left / 86400000);
    set(pairs.d, days);
    set(pairs.h, Math.floor(left / 3600000) % 24);
    set(pairs.m, Math.floor(left / 60000) % 60);
    set(pairs.s, Math.floor(left / 1000) % 60);
    const text = `${milestone.label} ${days} days`;
    if (sr.textContent !== text) sr.textContent = text;
  };
  if (pairs.d.length === 3 && (milestone.date - new Date()) / 86400000 < 100) pairs.d.shift().remove();
  tick();
  box.hidden = false;
  if (!reduceMotion) setInterval(tick, 1000);
}

/* ---------- Tabs (the Duo's poses) ---------- */

function tabs() {
  $$('[role="tablist"]').forEach((list) => {
    const buttons = $$('[role="tab"]', list);
    const select = (button, focus) => {
      buttons.forEach((other) => {
        const on = other === button;
        other.setAttribute("aria-selected", String(on));
        other.tabIndex = on ? 0 : -1;
        document.getElementById(other.getAttribute("aria-controls")).hidden = !on;
      });
      if (focus) button.focus();
    };
    buttons.forEach((button, i) => {
      button.addEventListener("click", () => select(button));
      button.addEventListener("keydown", (event) => {
        const move = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
        if (!move) return;
        event.preventDefault();
        select(buttons[(i + move + buttons.length) % buttons.length], true);
      });
    });
  });
}

/* ---------- Rate-it toy: half stars, like the app ---------- */

function rateToy() {
  const stars = $("[data-stars]");
  if (!stars) return;
  const card = stars.closest(".rate-card");
  const verdict = $(".verdict", card);
  const score = $$(".score .flap", card);
  const fills = $$("[data-fill]", stars);
  const words = {
    0.5: "Ouch.", 1: "Not for you.", 1.5: "It had a moment.", 2: "Fine. Just fine.",
    2.5: "Right down the middle.", 3: "Solid.", 3.5: "Really good.", 4: "Loved it.",
    4.5: "So close to perfect.", 5: "A masterpiece. Confetti is in order.",
  };
  let value = 0;

  const paint = (shown) => {
    fills.forEach((rect, i) => {
      const part = Math.max(0, Math.min(1, shown - i));
      rect.setAttribute("width", String(part * 24));
    });
  };
  const valueAt = (clientX) => {
    const box = stars.getBoundingClientRect();
    const raw = ((clientX - box.left) / box.width) * 5;
    return Math.max(0.5, Math.min(5, Math.ceil(raw * 2) / 2));
  };
  const commit = (next) => {
    value = next;
    paint(value);
    stars.setAttribute("aria-valuenow", String(value));
    stars.setAttribute("aria-valuetext", `${value} out of 5 stars`);
    verdict.textContent = words[value];
    const [whole, half] = value.toFixed(1).split(".");
    score[0].firstChild.textContent = whole;
    score[1].firstChild.textContent = half;
    score.forEach((flap) => { if (!reduceMotion) { flap.classList.remove("tick"); void flap.offsetWidth; flap.classList.add("tick"); } });
    if (value === 5) confetti(card);
  };

  stars.addEventListener("pointermove", (event) => { if (event.pointerType === "mouse") paint(valueAt(event.clientX)); });
  stars.addEventListener("pointerleave", () => paint(value));
  stars.addEventListener("pointerdown", (event) => commit(valueAt(event.clientX)));
  stars.addEventListener("keydown", (event) => {
    const move = { ArrowRight: 0.5, ArrowUp: 0.5, ArrowLeft: -0.5, ArrowDown: -0.5 }[event.key];
    if (!move) return;
    event.preventDefault();
    commit(Math.max(0.5, Math.min(5, value + move)));
  });
}

function confetti(card) {
  if (reduceMotion) return;
  const layer = document.createElement("div");
  layer.className = "confetti";
  const colours = ["#f5b942", "#ebebf0", "#30d158", "#ff9f0a", "#f5b942"];
  for (let i = 0; i < 44; i += 1) {
    const bit = document.createElement("i");
    const angle = Math.random() * Math.PI * 2;
    const reach = 120 + Math.random() * 200;
    bit.style.setProperty("--x", `${Math.cos(angle) * reach}px`);
    bit.style.setProperty("--y", `${Math.sin(angle) * reach - 60}px`);
    bit.style.setProperty("--r", `${Math.random() * 720 - 360}deg`);
    bit.style.background = colours[i % colours.length];
    bit.style.animationDelay = `${Math.random() * 90}ms`;
    layer.append(bit);
  }
  card.append(layer);
  setTimeout(() => layer.remove(), 1400);
}

/* ---------- Small things ---------- */

function reveal() {
  const items = $$(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) { items.forEach((item) => item.classList.add("in")); return; }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add("in"); observer.unobserve(entry.target); }
    });
  }, { rootMargin: "0px 0px -8% 0px" });
  items.forEach((item) => observer.observe(item));
}

function tilt() {
  const stage = $("[data-tilt]");
  if (!stage || reduceMotion || !window.matchMedia("(hover: hover)").matches) return;
  const layers = $$(".layer", stage);
  stage.addEventListener("pointermove", (event) => {
    const box = stage.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width - 0.5;
    const y = (event.clientY - box.top) / box.height - 0.5;
    layers.forEach((layer) => {
      const depth = Number(layer.dataset.depth || 10);
      layer.style.transform = `translate3d(${-x * depth}px, ${-y * depth}px, 0)`;
    });
  });
  stage.addEventListener("pointerleave", () => layers.forEach((layer) => { layer.style.transform = ""; }));
}

function storeLinks() {
  $$("[data-store]").forEach((link) => {
    if (APP_STORE_URL) {
      link.href = APP_STORE_URL;
      link.textContent = link.dataset.store || "Download on the App Store";
    } else {
      link.href = "#invite";
      link.dataset.openInvite = "";
      link.textContent = "Tell me when it's out";
    }
  });
}

/* ---------- Launch-list form ---------- */

// Before launch the site collects no TestFlight sign-ups, only a note of
// who wants to hear when the app is out. People with an iPhone Duo can
// also offer to test.

// The form writes an email; the visitor picks how to send it. Nothing is
// sent from this page.
function inviteForm() {
  const dialog = $("#invite");
  if (!dialog) return;
  const form = $("#invite-form");
  const done = $("#invite-done");
  const error = $("#invite-error");
  const gmail = $("#invite-gmail");
  const mail = $("#invite-mail");
  const hint = $("#invite-hint");
  const address = $("#invite-address");
  const copyBox = $("#invite-copy");
  const copyButton = $("#invite-copy-button");
  address.href = `mailto:${BETA_EMAIL}`;
  address.textContent = BETA_EMAIL;
  const fallbackMail = () => { location.href = `mailto:${BETA_EMAIL}?subject=${encodeURIComponent("CineTrack launch list")}`; };

  const open = () => {
    form.hidden = false; done.hidden = true; error.hidden = true;
    if (typeof dialog.showModal !== "function") return fallbackMail();
    if (!dialog.open) dialog.showModal();
  };
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-open-invite]");
    if (!trigger) return;
    event.preventDefault();
    open();
  });
  if (location.hash === "#invite" && !APP_STORE_URL) open();
  $$("[data-close-invite]", dialog).forEach((button) => button.addEventListener("click", () => dialog.close()));
  $("[data-edit-invite]", dialog).addEventListener("click", () => { done.hidden = true; form.hidden = false; });
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener("close", () => { if (location.hash === "#invite") history.replaceState(null, "", location.pathname); });

  copyButton.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(copyBox.value); }
    catch { copyBox.select(); document.execCommand("copy"); }
    copyButton.textContent = "Copied";
  });
  // If the Gmail app isn't installed its link does nothing, so say what to do instead.
  gmail.addEventListener("click", () => {
    if (!gmail.href.startsWith("googlegmail:")) return;
    setTimeout(() => { if (!document.hidden) hint.firstChild.textContent = "Gmail didn't open? Tap Copy the email, then paste it into a new email to "; }, 1500);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const name = (data.get("name") || "").trim();
    const email = (data.get("email") || "").trim();
    const devices = data.getAll("devices").join(", ");
    const note = (data.get("note") || "").trim();
    const duoTest = Boolean(data.get("duotest"));
    const fail = (message, field) => { error.textContent = message; error.hidden = false; form.elements[field]?.focus?.(); };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("That email doesn't look right.", "email");
    error.hidden = true;

    // A plain-text email (mailto can't carry formatting), laid out to read well.
    const body = [
      "Hi Afonso,", "",
      "Please tell me when CineTrack is on the App Store.", "",
      ...(name ? [`Name: ${name}`] : []),
      `Email: ${email}`,
      `Devices: ${devices || "Not said"}`,
      ...(duoTest ? ["", "I have an iPhone Duo and would like to help test before launch. The email above is the one on my Apple Account."] : []),
      ...(note ? ["", `Note: ${note}`] : []),
    ].join("\n");
    const subject = duoTest ? "CineTrack launch list (Duo tester)" : "CineTrack launch list";
    const query = `to=${encodeURIComponent(BETA_EMAIL)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const apple = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    // On iPhone and iPad the Gmail app has its own link; elsewhere Gmail opens in the browser.
    gmail.href = apple ? `googlegmail:///co?${query}` : `https://mail.google.com/mail/?view=cm&fs=1&${query.replace("subject=", "su=")}`;
    if (apple) gmail.removeAttribute("target"); else gmail.target = "_blank";
    mail.href = `mailto:${BETA_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    copyBox.value = `To: ${BETA_EMAIL}\nSubject: ${subject}\n\n${body}`;
    copyButton.textContent = "Copy the email";
    hint.firstChild.textContent = "Copying? Paste it into a new email to ";
    form.hidden = true; done.hidden = false;
  });
}

storeLinks();
inviteForm();
heroBoard();
countdown();
tabs();
rateToy();
reveal();
tilt();
