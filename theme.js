// CineTrack — light/dark switch. Loaded in <head> so the choice applies
// before the page paints. Light is the default; Dark is one tap away and
// remembered.
(function theme() {
  const KEY = "cinetrack-theme";
  const root = document.documentElement;
  root.classList.remove("no-js");
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch { /* private mode: follow the system */ }
  root.dataset.theme = saved === "dark" ? "dark" : "light";

  function paint() {
    const mode = root.dataset.theme;
    // Screenshots: each <picture> carries a dark <source>, switched on or off.
    document.querySelectorAll("source[data-dark]").forEach((source) => {
      source.media = mode === "dark" ? "all" : "not all";
    });
    document.querySelectorAll("[data-theme-set]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.themeSet === mode));
    });
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
      meta.content = mode === "dark" ? "#0e0e10" : "#f5f3ee";
    });
  }

  function choose(mode) {
    root.dataset.theme = mode;
    try { localStorage.setItem(KEY, mode); } catch { /* still applies for this visit */ }
    paint();
  }

  function wire() {
    document.querySelectorAll("[data-theme-set]").forEach((button) => {
      button.addEventListener("click", () => choose(button.dataset.themeSet));
    });
    paint();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
  else wire();
})();
