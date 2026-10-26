# Calybrate Journey Map

An interactive black-and-purple mind map of the Calybrate product journey — from the landing page to leadership insight — transcribed from 14 hand-drawn sketches (`1.jpeg` – `14.jpeg`).

## Features

- **Full map on open** — Calybrate → 4 acts → 15 chapters → 117 steps. Click a chapter to unfold it.
- **Play the story** — a hands-free walkthrough that starts at Calybrate and reveals every step in order, with captions and optional **voice narration** (browser text-to-speech). Pause, skip, change speed (1×–2×) or mute at any time.
- **Track progress** — set each step to Not started / In progress / Blocked / Done, leave comments, see an activity log.
- **Search, minimap, zoom/pan** — and pinch-to-zoom on touch devices. Works on phones.
- **Sketch viewer** — every chapter links back to the original photo it came from.

## Run it

No build step. Open `index.html` in a browser, or serve the folder:

```bash
python -m http.server 5173
```

Then visit <http://localhost:5173>.

## Notes

- Progress and comments are saved in the browser (`localStorage`). Use **⋯ → Export / Import** to share a copy.
- The journey content lives in `data.js`; the app is `app.js` + `styles.css`.
- Voice uses the browser's built-in speech voices, so it sounds different per browser/OS.
