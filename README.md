# Emotive

### Intelligence with a human touch.

An independent IT and AI agency website built as an explorable digital studio. Expressive editorial typography, real-time 3D, personal photography and a flowing ink cursor bring the story together — with accessible HTML underneath every visual effect.

**Vanilla JavaScript · Three.js · Canvas 2D · Zero package dependencies**

[Explore the Site](https://emotive-ai-studio.vastbuddy18.chatgpt.site) · [Source](https://github.com/shohidul-code/emotive-ai-studio)

## The experience

| Feature | What it does |
| --- | --- |
| Fluid cursor | Violet and cyan dye follows pointer movement, curls into eddies and fades naturally across the page. |
| Interactive studio | A fully modeled 3D room with scroll-driven camera paths, drag exploration, arrow-key movement, zoom and reset. |
| Adaptive rendering | WebGL 2 on supported devices; a perspective Canvas renderer of the same scene when WebGL is unavailable. |
| Personal photography | Four owner-supplied portraits used in the story, founder section, editorial pair and 3D wall frame. |
| Visitor controls | Light studio, motion, fluid cursor and High/Eco rendering quality. |
| Selected nasheed | The owner's exact YouTube selection, loaded only after sound is enabled, with visible native player controls. |
| Project conversations | Three clearly labeled concept explorations and a local, downloadable project-brief builder. |
| Responsive foundation | Mobile navigation, semantic sections, accessible dialogs, keyboard controls and reduced-motion support. |

## Run locally

Requirements: **Node.js 20+** for checks, and **Python 3** or any static HTTP server for preview. No package installation, API keys or environment variables are needed.

```bash
git clone https://github.com/shohidul-code/emotive-ai-studio.git
cd emotive-ai-studio
npm run build
python3 -m http.server 8080 --directory dist
```

Open `http://localhost:8080`. Use HTTP rather than opening `index.html` directly: the site uses ES modules and root-relative assets. GitHub access is required while the repository is private.

| Command | Purpose |
| --- | --- |
| `npm test` | Fluid simulation tests: rest, advection, fading, edge inputs and numeric stability. |
| `npm run check` | JavaScript syntax, module paths, local assets, unique IDs and internal anchor validation. |
| `npm run build` | Runs both checks. The committed `dist/` directory is already deployable; no compilation is needed. |

## Architecture

| Path | Responsibility |
| --- | --- |
| `dist/index.html` | Page content, navigation, photography, dialogs and settings. |
| `dist/styles.css` | Typography, responsive layouts, themes, motion and decorative effects. |
| `dist/app.js` | Page interactions, portrait switching, settings and local brief generation. |
| `dist/studio.js` | Three.js scene, materials, lighting, camera and room controls. |
| `dist/software-renderer.js` | Canvas perspective fallback using the same Three.js scene. |
| `dist/fluid-solver.js` | Bounded 2D velocity/dye field, semi-Lagrangian advection, vorticity and pressure projection. |
| `dist/fluid-cursor.js` | Pointer input, adaptive resolution, canvas output and effect lifecycle. |
| `dist/nasheed-player.js` | Official YouTube IFrame Player API integration. |
| `dist/assets/` | Local photographs, fonts, vendored Three.js and license files. |
| `tests/` · `scripts/` | Dependency-free regression tests and source validation. |
| `vercel.json` | Static deployment, `dist` output and pre-deployment checks. |

### Motion and performance

The fluid is a real simulated dye field, not a collection of cursor-following circles. It runs on a small bounded grid (144 cells along the longest dimension in High, 96 in Eco) and is smoothly enlarged to the viewport. It needs no additional WebGL context, so the studio and cursor work together on devices without GPU rendering.

Pointer events are passive, queued input is bounded, and the overlay has `pointer-events: none`. Native links, text selection, forms and room dragging remain available. The animation stops when dye dissipates, motion is disabled or the document becomes hidden. Eco caps fluid updates at 30fps. The site honors the initial system reduced-motion setting and responds when that preference changes; visitors can also control motion in Settings.

### Audio and privacy

Audio starts **off**. Enabling sound loads the official privacy-enhanced YouTube player for [`XOVHMU_K7no`](https://youtu.be/XOVHMU_K7no): *Emotional Famous Background Nasheed extended* by DefiniteTruth. The player is visible, loops the selected video and begins at a quiet volume. It may require a second press on YouTube's Play control. Closing it destroys the iframe. No video is extracted, downloaded or rehosted, and no Runway service is used.

YouTube scripts and frames are absent until a visitor enables sound. YouTube controls availability, advertising, regional restrictions and streaming behavior. The site includes no first-party analytics.

The project form creates a text file **locally in the browser**. It does not send email, upload personal information or store a server record. A real contact destination must be connected before offering message delivery. The sample projects are illustrative concepts, not client claims.

## Deploy to Vercel

Import this GitHub repository into the intended Vercel workspace. The committed configuration supplies:

- Framework preset: **Other** (`null`).
- Root directory: repository root.
- Install command: empty (there are no dependencies).
- Build command: `npm run build`.
- Output directory: `dist`.
- No environment variables required.

Keep the existing deployment-protection policy. After Git integration is connected, Vercel can build previews for branches and production from `main`. The original Sites project retains its own audience settings; Vercel access is managed separately. `.vercelignore` excludes Sites metadata and local tooling state from deployment uploads.

## Customize

- Edit agency copy and section structure in `dist/index.html`.
- Replace portraits in `dist/assets/` and update descriptive alt text. Update the `portraitViews` map in `app.js` for switchable images.
- Adjust the palette and layouts in `styles.css`; dye colors and opacity live in `fluid-cursor.js`.
- Tune the room, lights and camera paths in `studio.js`.
- Change the selected video ID in `nasheed-player.js` and update the visible credits and FAQ together.
- Connect a real contact destination deliberately; do not relabel the brief builder as a sent message without implementing delivery.

## Verification

Checked on 26 October 2026:

- All automated simulation and source-validation checks pass.
- Desktop page and embedded 390 × 844 mobile viewport inspected; mobile content has no horizontal overflow.
- Fluid output, on/off switch, motion interlock, Eco resolution and pointer pass-through exercised. An observed High-quality fluid frame took about 1.7ms in the test browser; this is a spot measurement, not a device-wide performance guarantee.
- Studio renders through the software fallback; explore, keyboard movement, reset, exit and light theme exercised.
- Portrait switches, concept dialog, project brief creation/editing, FAQs and mobile navigation exercised.
- Exact selected YouTube iframe loads only on opt-in; closing it removes the iframe and resets audio controls.

**Verification limits:** the test browser disables WebGL, so its GPU rendering path could not be visually tested. YouTube initialized and exposed the selected track, but the test browser buffered without confirming audible playback. Real touch hardware and screen-reader use were not tested. These are environment limits, not claims of full cross-device certification.

## Credits and asset rights

- Visual reference: [Emotion Agency — About](https://emotion-agency.com/about). This implementation uses original code, a modeled studio and adapted IT/AI content; it is not a pixel-identical copy of the original custom scene.
- Current photography supplied by the owner: `1000131373.png` → `portrait-reflection.png`; `1000131374.png` → `portrait-presence.png`; `1000131375.png` → `portrait-perspective.png`; `1000131376.png` → `portrait-thoughtful.png`. The four images are unmodified copies of the uploads, cropped only by page layout.
- Earlier original/generated portraits remain in `dist/assets/` but are not referenced by the current page.
- Three.js r169: MIT — see [THREE-LICENSE.txt](THREE-LICENSE.txt).
- Instrument Serif, Inter and IBM Plex Mono: SIL Open Font License — see the included OFL files and `dist/assets/licenses/`.
- Nasheed streamed through the official YouTube embed, credited above and in Settings.

Third-party assets retain their respective rights. No blanket redistribution license is granted for the owner's portraits, branding or the selected nasheed.
