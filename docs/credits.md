# Credits and asset licensing

None of the media, logos or code in this project comes from a third-party website. Everything is either public-domain (NASA) or made for this project.

## Public-domain imagery (NASA)

All three files are in `public/textures/` and are credited in the site footer, which links to NASA Visible Earth. NASA imagery is not subject to copyright in the United States. See the [NASA media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/).

| File | Source | Used for |
|---|---|---|
| `earth-day.jpg` (5400×2700) | NASA Visible Earth, *Blue Marble: Next Generation*, July 2004: [world.topo.200407.3x5400x2700.jpg](https://eoimages.gsfc.nasa.gov/images/imagerecords/74000/74393/world.topo.200407.3x5400x2700.jpg) | Earth's daytime surface |
| `earth-night.jpg` (3600×1800) | NASA Earth Observatory, *Earth at Night 2012* (VIIRS Day/Night Band): [dnb_land_ocean_ice.2012.3600x1800.jpg](https://eoimages.gsfc.nasa.gov/images/imagerecords/79000/79765/dnb_land_ocean_ice.2012.3600x1800.jpg) | City lights on Earth's night side |
| `earth-clouds.jpg` (2048×1024) | NASA Visible Earth, *Blue Marble* cloud layer: [cloud_combined_2048.jpg](https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_2048.jpg) | Cloud layer |

## Original work made for this project

Everything else was made for this project:

- **Real-time three.js scenes** in `lib/three/scenes/`: hero, kardashev, sunSurface, output, factory, space, mass, chip.
- **Stills:** the WebP stills in `public/media/` were rendered from those scenes with `npm run render:media` (`scripts/render-stills.mjs`), using the `/lab/[scene]` route.
- **Film:** `public/media/mass-film.webm` was recorded from the mass-driver scene.
- **SVG and canvas pieces:** the to-scale diagram (`components/Scaling/ScaleDiagram.tsx`), the "Always daytime in orbit" mark (`components/Space/DaytimeMark.tsx`), the partner text marks and the footer dot field.
- **Names:** "Meridian", "Northline" and "Vantage" are invented. All copy is original.

## Fonts

Fonts are self-hosted through `next/font/google` and licensed under the SIL Open Font License 1.1:
- Inter
- Inter Tight
- Unbounded
- Caveat

## Libraries

All libraries are MIT-licensed except GSAP:

| Library | License |
|---|---|
| Next.js | MIT |
| React | MIT |
| three.js | MIT |
| GSAP 3.12 (core + ScrollTrigger) | GreenSock "no charge" standard license |
| sharp (render script only) | Apache-2.0 |
| playwright-core (render script only) | Apache-2.0 |
