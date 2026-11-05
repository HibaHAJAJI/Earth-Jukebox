# Earth Jukebox — Listen to a Changing Planet

A NASA Space Apps Challenge project. Earth Jukebox is a multi-sensory instrument that reads NASA Earth Information Center visualizations and performs them as living soundscapes in real time, so every map you can see can also be heard.

## Tracks

| Track | Dataset |
| --- | --- |
| The Slow Fever | Global Surface Temperature Anomaly |
| Black Marble: The Pulse of Night | VIIRS Nighttime Lights of the World |
| The Breathing Ocean | Ocean Surface Currents & Chlorophyll |
| The Vanishing Ice | Arctic Sea Ice Minimum Extent |
| Fire Season | Global Wildfires & Smoke Aerosols |
| The Carbon Sky | Atmospheric CO₂ Concentration, GEOS-FP |

## How it works

1. A NASA visualization is loaded onto a canvas (`src/audio/analysis.ts`) and scanned column by column.
2. Brightness, hue and spatial distribution of each column are mapped to pitch, timbre, filter cutoff and stereo position.
3. A Web Audio synth (`src/audio/engine.ts`) performs the mapping live while the playhead sweeps across the image.
4. A radial equalizer and telemetry panel mirror what you hear, and a Listening Guide explains each sonic cue.

Built with accessibility in mind: keyboard shortcuts (`?` for help), reduced-motion mode, ARIA labelling and screen-reader text.

## Tech stack

- [Vite 7](https://vite.dev/) + [React 19](https://react.dev/) + TypeScript
- [Tailwind CSS 4](https://tailwindcss.com/)
- Web Audio API, Canvas 2D
- `vite-plugin-singlefile` — the production build is a single self-contained `dist/index.html`

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run typecheck  # TypeScript check
npm run build      # type-check + production build -> dist/
npm run preview    # serve the production build locally
```

## Deploy

The build output is static, so it can be deployed to any static host. On Vercel, import the repository and keep the defaults (framework: Vite, build command `npm run build`, output directory `dist`).

## Project structure

```
index.html            entry document (fonts, meta, favicon)
src/main.tsx          React root
src/App.tsx           layout, navigation, keyboard shortcuts
src/components/       Jukebox, Science, ListeningGuide, RadialEq, Telemetry, Starfield
src/audio/            image analysis + Web Audio synthesis engine
src/data/tracks.ts    track catalogue and dataset descriptions
public/images/        NASA visualizations used as sound sources
```

## Data sources

Imagery is derived from NASA Earth Information Center / NASA Scientific Visualization Studio products. NASA does not endorse this project.
