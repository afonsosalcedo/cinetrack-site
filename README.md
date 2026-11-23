# CineTrack — website

The website for CineTrack, an awards season companion for iPhone, iPad and iPhone Duo.

Static HTML, CSS and two small scripts. No build step, no dependencies, no tracking.

## Files

- `index.html`: the landing page.
- `privacy.html`, `terms.html`, `support.html`, `release-notes.html`, `404.html`: text pages. They share the header and footer, so change those in every file.
- `styles.css`: all styles. Colours are tokens at the top, with a light set under `:root[data-theme="light"]`.
- `theme.js`: the light/dark switch. Light by default; the visitor's choice is remembered.
- `site.js`: the split-flap board, the countdown, the Duo tabs and the rating toy.
- `assets/`: screenshots come in pairs, `name.jpg` (light) and `name-dark.jpg`.

## Things to set

- **App Store link.** Set `APP_STORE_URL` at the top of `site.js`. While it is empty the download buttons open the launch-list form, which writes an email to `BETA_EMAIL` asking to be told when the app is out (and, for iPhone Duo owners, offering to test).
- **Season dates.** The countdown reads the next season's dates from the `cinetrack-data` manifest. `FALLBACK_SEASON` in `site.js` is used only if that download fails.

## Preview

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765/.

## Hosting

GitHub Pages, served from the `main` branch root. `CNAME` holds the custom domain and `.nojekyll` turns off Jekyll.
