# Visualizer demo tracks

`right-time.mp3` is the bundled demo track for the oscilloscope.

Because files here are served same-origin from `/public`, the browser lets the
AnalyserNode read their raw samples — no CORS headers needed. That makes them the
guaranteed-working audio source for the visualizer.

Beats streamed from Cloudflare R2 only produce a real waveform once the bucket
sends `Access-Control-Allow-Origin` and `NEXT_PUBLIC_AUDIO_CORS=1` is set; until
then they drive a synthesized wave derived from the beat's BPM.

To add another demo track, drop the file here and append an entry to
`DEMO_TRACKS` in `src/visualizer/SourcePicker.jsx`. The `bpm` field is only read
by the synthesized fallback, which never runs for these local files.

The `.wav` files here are the drum-pad one-shots used by the About section.
