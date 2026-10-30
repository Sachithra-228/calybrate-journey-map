# Calybrate Journey Map

An interactive black-and-purple mind map of the Calybrate product journey — from the landing page to leadership insight — transcribed from 14 hand-drawn sketches (`1.jpeg` – `14.jpeg`).

## Features

- **Roadmap map** — Calybrate → 4 acts → 15 chapters → 117 steps. Open one part at a time: click an Act, then a chapter, then a step.
- **Play the story** — a hands-free walkthrough from Calybrate down through every step, with captions and optional **voice narration** (browser text-to-speech). Pause, skip, change speed or mute at any time.
- **Two team logins (Sandbox ⇄ Liveroom)** — separate sign-ins, shared progress. Works in local demo mode out of the box; see [`SETUP.md`](SETUP.md) to connect the real shared backend (Supabase).
- **Discussion on every section** — comment or raise an **issue** on any act, chapter or step; issues stay flagged until resolved. Live updates for both teams.
- **Reference images** — upload page-structure / reference images on any section; the other team opens them and comments right on the image.
- **Track progress** — Not started / In progress / Blocked / Done, with an activity feed of who did what.
- **Team themes and logos** — Calybrate purple by default, Sandbox black and yellow, Liveroom deep blue. The theme follows your team after sign-in and can be switched from the overview panel. Team logos appear wherever a team is shown.
- **Mobile friendly** — compact layout, pinch-to-zoom, bottom-sheet panel.
- **Sketch viewer** — every chapter links back to the original photo it came from.

## Run it

No build step. Open `index.html` in a browser, or serve the folder:

```bash
python -m http.server 5173
```

Then visit <http://localhost:5173>.

## Notes

- **Demo mode** (default): everything stays in this browser (`localStorage`). **Shared mode**: set the two values in `config.js` after following `SETUP.md`.
- The roadmap content lives in `data.js`; the app is `app.js`, `store.js` (data layer) and `styles.css`.
- Voice uses the browser's built-in speech voices, so it sounds different per browser/OS.
