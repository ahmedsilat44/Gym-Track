---
name: Spotter
description: Mobile-first workout planning, tracking, and private training community.
colors:
  background: '#0b1326'
  surface-lowest: '#060e20'
  surface-low: '#131b2e'
  surface: '#171f33'
  surface-high: '#222a3d'
  surface-highest: '#2d3449'
  text: '#dae2fd'
  muted: '#8f9d9a'
  outline: '#3c4a46'
  primary: '#57f1db'
  primary-dim: '#3cddc7'
  on-primary: '#003731'
  coral: '#ffb2b9'
  coral-deep: '#891933'
  indigo: '#b3b9ff'
  error: '#ffb4ab'
  warning: '#ffc477'
  info: '#86b9ff'
  success: '#8ade9b'
  chart-purple: '#c99cff'
  chart-slate: '#78938e'
  chart-blue: '#74c7ff'
typography:
  display:
    fontFamily: Hanken Grotesk, sans-serif
    fontSize: clamp(2rem, 6vw, 2.8rem)
    fontWeight: '800'
    lineHeight: '1.05'
    letterSpacing: '-0.02em'
  headline:
    fontFamily: Hanken Grotesk, sans-serif
    fontSize: clamp(1.45rem, 4vw, 1.9rem)
    fontWeight: '700'
    lineHeight: '1.15'
    letterSpacing: '-0.02em'
  body:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: '1.55'
  label:
    fontFamily: JetBrains Mono, monospace
    fontSize: 0.73rem
    fontWeight: '600'
    lineHeight: '1.5'
    letterSpacing: '0.11em'
rounded:
  input: 12px
  card: 18px
  panel: 24px
  pill: 999px
spacing:
  unit: 4px
  compact: 8px
  default: 16px
  section: 32px
  mobile-gutter: 20px
components:
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.on-primary}'
    rounded: '{rounded.pill}'
    height: 48px
    padding: 0 22px
  button-secondary:
    backgroundColor: transparent
    textColor: '{colors.primary}'
    rounded: '{rounded.pill}'
    height: 48px
    padding: 0 22px
  input-search:
    backgroundColor: '{colors.surface-lowest}'
    textColor: '{colors.text}'
    rounded: 16px
    height: 52px
    padding: 0 16px
  card-glass:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
    rounded: '{rounded.card}'
    padding: 16px
  nav-bottom:
    backgroundColor: '{colors.surface-low}'
    textColor: '{colors.muted}'
    rounded: 22px
    height: 68px
---

## Overview

**Creative North Star: "The Midnight Training Console."** Spotter should feel like a calm, capable training instrument: deep navy surroundings, bright teal confirmation, and precise numeric detail. It is made first for a phone held between sets, then expands into a spacious desktop workspace without losing that focused, athletic character.

The atmosphere is premium and tactile rather than decorative. Layered navy surfaces, faint teal and indigo bloom, and restrained translucency give active controls depth. The interface earns visual emphasis through training state, not through competing ornament.

**Key Characteristics:**

- Mobile-first, thumb-reachable controls with safe-area-aware fixed navigation.
- Dark, high-legibility instrumentation with Hanken Grotesk headings and monospaced workout data.
- Teal-led action hierarchy; coral, indigo, and chart colors communicate distinct secondary states.
- Rounded layered cards, low-contrast boundaries, and gentle glows instead of harsh shadows.
- Charts and progress views that favor a continuous, readable signal over visual noise.

## Colors

The dark surface stack establishes depth from the page canvas through raised cards. Text stays cool and bright; muted text supports labels, helper copy, and chart axes without disappearing.

**The Teal Action Rule.** Use the primary token for the one action or state that matters most in a view: save, start, complete, selected, or current. Do not spend it on unrelated decoration.

Coral flags high-intensity, destructive, or attention-needed states. Indigo and the named chart colors distinguish comparable data series. Error, warning, info, and success remain semantic status colors; they do not replace the primary action color.

**The Dark Surface Rule.** Build hierarchy by moving through the established surface stack and a soft outline before adding a new background color. The page background remains visible around cards so sections keep their depth.

## Typography

Hanken Grotesk carries the athletic voice in page titles, section titles, and large outcome values. Inter handles instructions, names, descriptions, and form copy. JetBrains Mono is reserved for labels, timestamps, counts, weights, durations, and chart axes.

**The Instrument Readout Rule.** Any value a lifter compares between sets should use the label or metric treatment: compact, tabular-looking, and visually stable as a timer or count changes.

Use display scale only for a page’s primary outcome or hero moment. Let body copy stay comfortably readable; do not force all workout text into uppercase or monospaced type.

## Layout

Use the four-pixel spacing unit. The default content gutter is 20px on mobile, page sections normally separate by 32px, and cards use 16px internal breathing room. Primary mobile actions must remain at least 44px tall or wide.

**The Between-Sets Rule.** The current action, live workout state, and continuation path stay reachable with one hand. Fixed elements respect the device safe area and never hide the last item in a scrollable page.

On larger screens, constrain main content to a readable central column and use grids for independent cards. Preserve the mobile information order; wider layouts add columns rather than moving core actions away from their content.

## Elevation & Depth

Depth comes from tonal layering: the background is deepest, standard cards sit on the surface layer, and selected or floating elements can rise into the higher surfaces. Glass cards use a quiet translucent gradient, a faint cool border, and backdrop blur to separate dense content without making it glow like chrome.

**The Quiet Glow Rule.** Teal glow belongs to active progress, primary actions, and focused status. Keep it soft and local; if a card reads clearly without glow, do not add it.

Use the shared ambient shadow for floating navigation, hero cards, dialogs, and elevated panels. A thin low-opacity outline is preferred to a heavy shadow when two adjacent cards need separation.

## Shapes

The system is softly rounded and ergonomic. Inputs use the compact input radius, ordinary cards use the card radius, hero and feature panels use the panel radius, and buttons, tags, and count pills use the full pill radius.

**The Touch Shape Rule.** Small controls may be visually compact, but their interactive area stays generous. Circle icon buttons and pill controls should feel deliberate, not tiny.

Avoid sharp-cornered containers and avoid mixing several radii inside one small component unless the nesting itself communicates hierarchy.

## Components

### Buttons

Primary buttons are solid teal pills with dark text and a small lift on hover. Secondary buttons are transparent with a teal outline. Destructive actions use the error treatment and remain visually distinct from ordinary secondary actions. All buttons expose a clear teal keyboard focus ring.

### Cards and Panels

Use the glass-card treatment for dashboard modules, progress panels, and grouped content. Cards have calm navy depth, a faint boundary, and enough padding for scan-friendly rows. Keep dense utility rows flatter when a separate card would create unnecessary nesting.

### Inputs and Filters

Search and text inputs sit on the lowest surface with a subtle outline. Focus shifts the outline toward teal and adds a restrained outer halo. Placeholder text stays muted; it is never the only label for a field that needs a persistent accessible name.

### Navigation

The bottom navigation is a blurred, elevated rounded bar. Each item has a roomy touch target, a monospaced label, and a teal active state with a small illuminated dot. Navigation stays fixed above mobile safe areas.

### Progress and Charts

Time-series charts sit inside bounded cards with sparse low-contrast horizontal grid lines and muted monospaced axes. Use a continuous teal line with rounded joins, a faint area wash, and clear emphasis on the latest point. Metric rails are horizontally scrollable pill controls; selection changes the chart, readout, units, and accessible summary together.

### Dialogs

Dialogs use the native modal surface for focus management. The backdrop is dark and quiet; the dialog itself follows the same elevated card language, has a visible close action, and returns focus to the invoking control when dismissed.

## Do's and Don'ts

### Do:

- **Do** give the most important action or current workout state the primary teal treatment.
- **Do** use JetBrains Mono for metrics that change during a workout, including rest timers and set counts.
- **Do** preserve 20px mobile gutters, 44px minimum touch targets, and safe-area spacing for fixed controls.
- **Do** make chart lines continuous across available dates and provide a plain-language summary outside the SVG.
- **Do** use the shared surface stack, border, shadow, and focus treatment before introducing a one-off visual style.

### Don't:

- **Don't** use teal, coral, indigo, and chart accents with equal visual weight in one component.
- **Don't** place critical actions only in hover states or below a fixed mobile control.
- **Don't** use heavy opaque shadows, pure black cards, or high-contrast borders as default depth cues.
- **Don't** animate timers or state changes when reduced-motion preferences request stillness.
- **Don't** rely on color alone to explain a status, selected state, or chart series.
