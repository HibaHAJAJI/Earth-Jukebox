# Sonification — Earth Jukebox

The sonification layer turns the selected monthly temperature anomaly into sound
with the browser's Web Audio API. It is implemented in
[`src/services/sonificationService.js`](./src/services/sonificationService.js)
and consumed by [`src/components/AudioControls.jsx`](./src/components/AudioControls.jsx).
No audio files, network requests, or extra dependencies are used.

## 1. Mapping

### Pitch

The pitch domain is fixed for the whole dataset so months from different years
are directly comparable:

| Temperature anomaly | Frequency | Musical reference |
| --- | --- | --- |
| −2.0 °C | 220 Hz | A3 (low) |
| 0.0 °C | 440 Hz | A4 (1951–1980 baseline) |
| +2.0 °C | 880 Hz | A5 (high) |

The mapping is logarithmic in frequency because pitch perception is
multiplicative. Equal temperature intervals therefore sound like equal musical
intervals:

```text
normalized = clamp((anomaly - (-2.0)) / (2.0 - (-2.0)), 0, 1)
frequency  = 220 × (880 / 220) ^ normalized
```

Values below −2.0 °C or above +2.0 °C are clamped to the nearest pitch. The
displayed anomaly is never changed. Higher anomalies always produce higher
pitches within the range.

### Rhythm and time

- One selected month = one short note.
- The shared timeline advances the month; the engine does **not** maintain a
  second cursor.
- At 1× one month lasts 620 ms. The speed control (0.5×, 1×, 2×, 4×) changes
  both the visual timeline interval and the audio envelope.
- Playback stops at the last month in the selected dataset.

### Year boundary

When playback crosses into a later year, a quiet bell accent sounds at twice the
note frequency. The bell decays quickly so it does not mask the next month.
Jumping backwards (for example Replay) does not ring the bell.

### Missing data

A `null` or absent anomaly produces silence for that month. Missing values are
never converted to `0 °C` or to an invented pitch.

### Smoothness

- Pitch changes glide over a short interval instead of jumping.
- Each note has an attack and release envelope.
- Pause fades out before suspending the audio context.
- Stop fades out, closes the context, and releases all nodes.

## 2. Controls

| Control | Behaviour |
| --- | --- |
| Play | Starts audio for the selected month and starts the shared timeline. |
| Resume | The Play button becomes Resume after a pause; it continues from the paused month. |
| Pause | Stops audio and the timeline without changing the selected month. |
| Stop | Stops audio immediately, closes the audio context, and resets the timeline to the first month. |
| Replay | Restarts the shared timeline at the first month and plays from there. |
| Playback speed | Changes the shared timeline and audio tempo. |
| Volume | Smoothly changes the master gain (0–100%). |
| Escape key | Immediate stop while audio is playing. |

A single `AudioContext` and a single monophonic oscillator are reused. Repeated
Play/Pause/Stop/Replay interactions cannot leave overlapping audio sessions.
Stopping or unmounting the audio panel closes the context.

### Browser restrictions

The `AudioContext` is created or resumed from a user action. If the browser
blocks it, or Web Audio is unavailable, the engine rejects with a readable error
and the panel announces **Audio error**. There is no autoplay on page load.

## 3. Synchronization

`src/pages/Explore.jsx` owns one `useTimeline` instance. The chart, summary,
scientific context, timeline, and audio panel all receive the same
`currentRecord`. Audio never creates its own selected month.

- Timeline Play/Pause/Stop drive the engine through `AudioControls`.
- Every `currentRecord` change is sent with `updateData(record)`.
- Audio Replay uses the same timeline's new `replay()` action.
- The speed control is shared: changing it in either panel updates both.

## 4. Accessibility

- All controls are native buttons, a native range input, and a native select,
  reachable by keyboard.
- Every control has an explicit accessible label.
- The panel has a visible **Current sound** explanation and a polite
  screen-reader live region describing the selected month, anomaly, pitch and
  frequency.
- A visible legend explains pitch, rhythm, year bells, and missing-data silence.
- The selected month and anomaly remain visible in text, so the chart is not
  required to explore the data.
- Audio does not start automatically.
- Stop and Escape provide immediate silence.
- Reduced-motion preferences are respected by the existing CSS.

## 5. Testing

### Unit tests

```bash
cd frontend
npm test
```

`tests/sonification.test.js` checks:

- the fixed mapping endpoints and midpoint
- monotonic pitch for increasing anomalies
- clamping outside the fixed domain
- silence for missing data
- play/pause/resume/stop/replay lifecycle with a fake AudioContext
- volume and playback-speed state
- no overlapping oscillators after repeated calls

### Browser verification

Run `npm run dev`, open `/explore`, and verify in the browser console:

```js
const { getSonificationEngine } = await import('/src/services/sonificationService.js')
getSonificationEngine().getState()
```

While playing, `contextState` should be `running`, `frequencyHz` should change
with the selected anomaly, and `outputLevel` should be greater than zero. After
Stop, the context should be `closed` and `isPlaying` should be `false`.

Also check keyboard operation, the live-region text, the visible legend, and that
the browser console has no errors.
