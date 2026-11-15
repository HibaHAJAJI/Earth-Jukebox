# Earth Jukebox: Smart AI Climate Voice Agent

An upgrade to Earth Jukebox that adds a live, multilingual AI Climate Scientist voice agent whenever you click any country, city region, or ocean on the 3D globe, paired with an always-accessible top-bar **Mute Agent** button that silences the agent independently of the Earth Jukebox music.

## User Review & Critical Decisions

> [!IMPORTANT]
> All core UX and technical choices below reflect your confirmed answers from Phase 1.

- **Agent Intelligence & Voice**: **Smart AI Scientist with live voice** — Clicking any location sends the real coordinates, country/ocean name, active climate layer, year (`1980–2026`), and sampled climate value to a server-side Gemini endpoint (`gemini-4-hydrogen`) for a concise 2-sentence scientific insight, then speaks it aloud via Gemini neural speech (`gemini-3.8-flash-lite-tts`) with automatic browser speech fallback.
- **Multilingual Output**: **Switchable between English, French, and Arabic** — A dedicated `EN / FR / AR` language selector in the control dock controls both the AI explanation text (including clean right-to-left layout for Arabic) and the spoken voice locale.
- **Always-Reachable Mute Control**: **Top-of-site Mute Agent button** — Placed prominently in the top-right header zone (and kept pinned even in Zen Mode) so you can silence or re-enable the AI agent with a single click at any moment without affecting the Earth Jukebox climate soundscape.

---

## 1. Overview & Core Concept

- **What It Does**: Transforms every click on the 3D Earth into an interactive briefing. Immediately upon clicking a region (for example, Morocco, the Amazon Basin, or the North Atlantic), the probe beacon lands on the surface, plays a localized harmonic chime, displays the instant numeric readout, and invokes the Smart AI Climate Scientist to explain what that reading means for that specific region and year in your chosen language.
- **Target Audience**: Blind and low-vision users, students, and hackathon judges exploring NASA Earth Information Center visualizations through both musical sonification and clear spoken scientific context.
- **Key Value**: Bridges raw climate numbers and abstract soundscapes with human-friendly, multilingual scientific storytelling—while preserving complete user control to silence the voice agent at any time and listen purely to the planet's audio.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Always-Available Top Mute Control**:
   - At the top-right of the observatory header sits the dedicated **Mute Agent / Agent Muted** button (also bound to keyboard shortcut `A`).
   - Clicking **Mute Agent** immediately stops any spoken audio mid-sentence and prevents future globe clicks from triggering voice playback, while keeping the visual probe readout and the Earth Jukebox ambient/pixel-scan audio running uninterrupted.
   - When **Zen Mode (`H`)** slides away the main navigation bar and bottom dock, the compact top-right **Mute Agent** toggle remains accessible so the user can silence the agent at any time.
2. **Click-to-Explain Flow on the 3D Globe**:
   - **Instant Feedback (`0ms`)**: Clicking a country or ocean places the 3D pulse beacon, plays a gentle probe chime, and populates the bottom dock's probe strip with the place name, coordinates (`tabular-nums`), and exact climate metric.
   - **AI Insight Generation**: A subtle inline loading state appears in the probe strip while the server-side Gemini scientist composes a concise 2-sentence explanation tailored to the selected layer (`Temperature Anomaly`, `Polar Sea-Ice Extent`, `Ocean Heat & Currents`, or `Wildfires & Carbon Plumes`), the selected year, and the chosen language (`EN`, `FR`, or `AR`).
   - **Live Spoken Delivery & Ducking**: If the agent is unmuted, the spoken voice plays automatically while gently ducking the Earth Jukebox soundscape volume down slightly, then smoothly restores the soundscape volume once speaking finishes.
3. **Language Switching (`EN` / `FR` / `AR`)**:
   - A compact segmented language control (`EN | FR | AR`) sits inside the bottom control dock.
   - Switching languages stops any in-progress speech and applies the selected language to subsequent clicks (or refreshes the active probed location explanation if one is currently selected).

### Visual Identity & Layout Alignment

- **Calm Deep-Space Observatory Theme**: Retains the existing `#07090E` deep-space canvas, `#0B0F19` single-elevation dock, `Plus Jakarta Sans` / `DM Sans` typography, and `JetBrains Mono` (`tabular-nums`) telemetry figures.
- **Clean Three-Zone Top Bar**:
  - **Left**: `Earth Jukebox` wordmark.
  - **Center**: The 4 single-line climate layer links (`Temperature`, `Sea Ice`, `Oceans`, `Fires & CO₂`).
  - **Right**: Dedicated **Mute Agent / Agent Muted** action button (`whitespace-nowrap shrink-0`, clear icon + text state, high-contrast sky/amber focus ring, never hue-only).
  - **Guide Access**: The **How It Works** trigger moves cleanly into the bottom dock's utility row so the top bar remains spacious and single-purpose with the Mute Agent button always prominent.
- **No Anti-Slop Clutter**: Zero pulsing status dots, zero pill enclosures around metadata, and full `dir="rtl"` alignment when displaying Arabic scientific explanations.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Full-Stack Express Proxy for Gemini Intelligence & Speech**
  - *Chosen Approach*: Add a lightweight Express server entry point (serving Vite middleware in development and static assets in production) that exposes two dedicated API endpoints for text generation (`gemini-4-hydrogen`) and neural speech (`gemini-3.8-flash-lite-tts`), keeping API credentials strictly server-side.
  - *Why*: Protects credentials, unlocks natural multilingual voices across English, French, and Arabic (including Moroccan-friendly clarity where browser voices often lack Arabic support), and follows recommended `@google/genai` server patterns.
  - *Alternatives Considered*: Browser-only `speechSynthesis` was kept as an automatic client-side fallback if offline or if a TTS request fails, rather than as the sole voice source.
- **Decision 2: Request Cancellation & Anti-Overlap Queue**
  - *Chosen Approach*: Assign each globe click a monotonically increasing request ID (`AbortController`) and cancel any previous audio clip or `speechSynthesis` utterance before starting the new one.
  - *Why*: Rapidly clicking across multiple countries must never cause overlapping voices or stale commentary from an earlier click.
- **Decision 3: Independent Audio Bus with Soft Music Ducking**
  - *Chosen Approach*: Keep the Web Audio climate synthesizer (`EarthSonificationEngine`) and the Agent speech playback on separate controls, applying a smooth `gain.setTargetAtTime` duck (~35% reduction) only while the agent is actively speaking.
  - *Why*: Users can mute the agent while keeping Earth's music playing, or mute the Earth music while still hearing the scientist explain clicked countries.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Top Header (Always-Accessible Zone)                                     │
│  [Earth Jukebox]     [4 Climate Layers]     [Mute Agent / Agent Muted]   │
└─────────────────────────────────────────────────────────┬────────────────┘
                                                          │ toggles agentMuted
┌───────────────────────────┐                             ▼
│  3D Earth Viewport        │  click (lat, lon)   ┌────────────────────────┐
│  • Country/Ocean Lookup   ├────────────────────►│  App State & Agent     │
│  • Climate Value Sampler  │                     │  Controller            │
└───────────────────────────┘                     │  • lang: EN | FR | AR  │
                                                  │  • AbortController     │
┌───────────────────────────┐                     │  • agentSpeaking state │
│  Bottom Control Dock      │◄────────────────────┤  • duckMusic() hook    │
│  • EN / FR / AR Selector  │  explanation text   └───────────┬────────────┘
│  • Probe Readout + Caption│                                 │
│  • Audio Play / Timeline  │                                 │ POST /api/agent/*
│  • How It Works Button    │                                 ▼
└──────────────┬────────────┘                     ┌────────────────────────┐
               │                                  │  Express Server Proxy  │
               │ ducking (gain ramp)              │  • gemini-4-hydrogen   │
               ▼                                  │    (2-sentence insight)│
┌───────────────────────────┐                     │  • gemini-3.8-flash-   │
│  Web Audio Synthesizer    │                     │    lite-tts (WAV audio)│
│  (Ambient / Pixel Scan)   │                     └────────────────────────┘
└───────────────────────────┘
```

### Interactive Component & State Mapping

- **Agent Mute State (`agentMuted`)**: Managed at the root application level and passed to the always-accessible top-bar toggle and keyboard handler (`A`). Toggling to muted immediately invokes `stopAgentSpeech()`, cancels active `AbortController` fetches, and restores Earth music gain to full volume.
- **Location Explanation Lifecycle**:
  1. Globe click emits `{ lat, lon, regionName, formattedValue, normalizedValue, narrative }`.
  2. Probe UI updates immediately with the local telemetry and sets `agentLoading = true`.
  3. Server generates a localized 2-sentence explanation via `gemini-4-hydrogen` (passing place name, coordinates, climate layer title/dataset, year, and sampled value).
  4. If `!agentMuted` and the request is still current, client requests WAV speech from the server TTS endpoint (`gemini-3.8-flash-lite-tts`), ducks the Web Audio synthesizer smoothly, and plays the WAV clip (falling back to localized `window.speechSynthesis` if TTS returns an error).
  5. When audio playback finishes or is interrupted, Web Audio gain ramps smoothly back up.
- **Accessibility & Existing Features Preserved**: Screen-reader `aria-live="polite"` announcements continue to receive updates, and all existing 3D globe features (undivided Morocco map, timer-synced Earth rotation, zoom-revealed cities, graticule, and Dual-Mode sonification) remain completely intact.
