# SRouter design direction

The author of every field below is the project owner. This file records their
answers; it is not agent-invented style. When a value changes, change it here and
the agent applies the new value.

## Identity

SRouter is a self-hosted LLM gateway. The person using this dashboard runs it
themselves: they care about throughput, failures, and cost, and they open the
dashboard to find out what the gateway is doing. The interface is a **technical
operator tool**, not a product surface. It is judged on its data and should stay
out of the way.

## Dials

`Dial: ENERGY 1 / RHYTHM 1 / MOTION 2`

- **ENERGY 1 (calm).** Quiet, structural, type-led. No visual voice beyond
  hierarchy. Same reference family as Linear and GOV.UK: the interface says hello
  softly.
- **RHYTHM 1 (uniform).** A uniform grid is a deliberate choice here, not an
  oversight: an operator scans the same shape repeatedly and should not have to
  re-learn the layout per screen. Uniformity is the point.
- **MOTION 2 (transitions).** Transitions and landings when data arrives. No
  entrance animation on static chrome, no looping or pulsing decoration.

## Typography

- **Inter** for everything, via `--font-body` / `--font-sans`. Reason: it is a
  neutral UI face that does not compete with the data. It is not chosen because
  it is a default; it is chosen because a monitoring surface needs a face that
  disappears behind numbers. Body copy stays at `--text-xs` and `--text-sm`,
  which is where this dashboard is read.
- Numbers are always `tabular-nums`, so a changing figure does not jitter.

## Color

- Neutral surfaces carrying the semantic tokens already defined in
  `components/arc/foundation.css`: `--surface`, `--surface-muted`, `--foreground`,
  `--text-secondary`, `--text-muted`, `--border`.
- **One accent**, `--accent`, reserved for the single active or emphasized thing
  on a screen. Not for decoration. Status colors (`--success`, `--warning`,
  `--danger`) mean status and always carry a label.
- Both themes (`data-theme="light"` and `data-theme="dark"`) must read correctly.
  The tokens are already defined for both; nothing may be hardcoded.

## Layout

- Tokens from `foundation.css`: `--space-*` for spacing, `--radius-surface` /
  `--radius-panel` / `--radius-control` for radii, `--text-*` for size,
  `--tracking-*` and `--leading-*` for rhythm.
- The dashboard is a fixed sidebar plus a scrolling content column, matching the
  `/auth/login` screen's token usage rather than the Tailwind palette.
- One focal point per screen. Supporting figures defer to it.

## Reference

`client/src/routes/auth/login.tsx` is the existing screen that already uses these
tokens (`--surface`, `--border`, `--radius-surface`, `--text-xl`, `--tracking-body`).
New shell work matches its token usage.
