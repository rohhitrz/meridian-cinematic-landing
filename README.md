# Meridian — cinematic scroll landing page

A cinematic, scroll-driven landing page built with **Next.js 15**, **React 19**, **three.js** and **GSAP ScrollTrigger**. Every section is driven by scroll progress: real-time WebGL scenes (Earth → Sun zoom-out, a sun surface shader, a factory campus, orbital scenes, a mass driver, chip renders) scrub with the page instead of seeking video.

"Meridian" is a fictional brand used for this design study. All copy is original, and the page ships with `noindex` headers.

## Features

- Real-time three.js scenes in `lib/three/scenes/`, scrubbed directly by scroll progress
- Pinned / sticky scroll sections with GSAP ScrollTrigger
- Staggered reveal-on-scroll primitives (`components/ui/Reveals.tsx`)
- Hand-built SVG/canvas pieces: to-scale diagram, footer dot field, orbit mark
- Responsive layouts for desktop, tablet and mobile
- `/lab/[scene]` route to view any scene in isolation
- Pre-rendered WebP posters + a WebM film generated from the scenes themselves

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000. No environment variables are required (see `.env.example`).

### Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run typecheck` | TypeScript check |
| `npm run render:media` | Re-render the stills in `public/media/` from the `/lab` scenes (needs a running server and local Chrome; set `BASE_URL` / `CHROME_PATH` if needed) |

## Project structure

```
app/              App Router entry, fonts, global tokens, /lab scene viewer
components/       One folder per page section (Hero, Kardashev, Sun, Factory, ...)
lib/three/        three.js stage, shared GLSL, scene registry and scenes
lib/motion.ts     Scroll/motion helpers
public/textures/  NASA public-domain Earth textures
public/media/     Stills and film rendered from the project's own scenes
scripts/          Media render script (Playwright + sharp)
```

## Credits

Earth textures are public-domain NASA imagery; everything else was made for this project. Fonts are OFL-licensed via `next/font`. See [docs/credits.md](docs/credits.md) for full details and library licenses (note: GSAP uses the GreenSock standard "no charge" license).
