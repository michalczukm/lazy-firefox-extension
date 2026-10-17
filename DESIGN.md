---
name: lazy
description: A calm, touch-operated household dashboard and webpage launcher.
colors:
  paper: "#fbfaf5"
  ink: "#263d33"
  muted: "#58675c"
  line: "#cdd5ca"
  soft: "#e5eadd"
  accent: "#59784f"
  error: "#8f392b"
  pressed: "#d4dfcd"
  scrollbar: "#7d8b7d"
typography:
  display:
    fontFamily: "Atkinson, sans-serif"
    fontSize: "96px"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-.04em"
  headline:
    fontFamily: "Atkinson, sans-serif"
    fontSize: "36px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-.025em"
  title:
    fontFamily: "Atkinson, sans-serif"
    fontSize: "30px"
    fontWeight: 600
    letterSpacing: "-.025em"
  body:
    fontFamily: "Atkinson, sans-serif"
    fontSize: "16px"
    fontWeight: 400
  condition:
    fontFamily: "Atkinson, sans-serif"
    fontSize: "20px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Atkinson, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  launcher:
    fontFamily: "system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.3
rounded:
  menu-item: "8px"
  launcher: "12px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "28px"
  xxl: "32px"
  section: "48px"
components:
  weather-reading:
    textColor: "{colors.ink}"
    typography: "{typography.display}"
  destination-row:
    textColor: "{colors.ink}"
    padding: "24px 4px"
  destination-row-hover:
    backgroundColor: "{colors.soft}"
  destination-row-active:
    backgroundColor: "{colors.pressed}"
  refresh-action:
    textColor: "{colors.ink}"
    padding: "10px"
    rounded: "{rounded.menu-item}"
    width: "44px"
    height: "44px"
  launcher-trigger:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.launcher}"
    padding: "12px"
    width: "48px"
    height: "48px"
  launcher-trigger-expanded:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  launcher-menu:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.launcher}"
    padding: "4px"
---
# Design System: lazy

## Overview

**Creative North Star: "Calm household launcher"**

Warm paper, dark green type, generous breathing room, and prominent weather numbers make lazy easy to read at a glance and comfortable to operate by touch. The dashboard is quiet and flat; the compact launcher floats above ordinary webpages.

Use simple geometric SVG icons rather than imagery. The approved palette and restrained composition define the visual identity; the launcher uses native system type to fit its host pages.

**Key Characteristics:**

- Warm neutral paper with dark green text.
- Large touch targets and a clear numerical hierarchy.
- Flat dashboard, compact floating launcher, Polish interface copy.

## Colors

The frontmatter records the implemented palette. Ink is the primary green for text, controls, selection, and focus. Accent is the quieter green for icons and the wordmark dot. Paper is the page and launcher surface; muted supports secondary information; line separates forecast and destination rows. Soft and pressed identify pointer states. Error identifies stale or unavailable weather status, alongside explanatory text. Scrollbar is used only for scroll affordances.

## Typography

The dashboard self-hosts Atkinson Hyperlegible Next at regular, semibold, and bold weights (400, 600, 700), registered under the CSS family name `Atkinson`, with `font-display: swap` and a sans-serif fallback. The launcher deliberately uses system-ui.

The display role is the temperature, with tabular numbers and a smaller raised unit. Headline is the city; title is a destination name. The wordmark is bold (32px); the destination heading and forecast figures are semibold (25px); apparent temperature is 18px; attribution is 13px. Body and labels carry descriptions, time, and status. At narrow widths the city becomes 32px, destination names 28px, and temperature uses `clamp(72px, 21vw, 96px)`.

## Layout

The dashboard container is centered, capped at 1240px, with desktop padding of 36px 64px 48px. Weather sits on the left and destinations on the right in a `1.12fr 1fr` grid, separated by 96px. Content begins below the masthead with `clamp(56px, 11vh, 128px)` of breathing room.

At 1050px and below, horizontal padding becomes 40px and the column gap 56px. At 720px and below, the dashboard stacks weather above destinations, caps its width at 560px, uses 28px horizontal padding and a 48px section gap. Below 350px, horizontal padding falls to 18px and icon/row spacing tightens. The document supports widths down to 280px.

The weather heading places a compact refresh icon beside the city. A wrapping metadata row immediately below holds the update status and Open-Meteo attribution, without a separate block beneath the forecast.

The launcher stays at the top right, offset by at least 12px and respecting safe-area insets. Its horizontal menu scrolls within the viewport; it does not become a stacked menu on mobile. Only the controls accept pointer input, leaving surrounding webpage content usable.

## Elevation & Depth

The dashboard has no shadows or raised cards: space and fine dividers establish hierarchy. The launcher trigger, menu, and feedback message share a compact floating shadow (`0 3px 15px #142b2526`) to remain distinct from the host page.

## Shapes

The dashboard uses open sections and straight dividers. Launcher shells have gently rounded corners; menu items and feedback messages use the smaller radius recorded in frontmatter. Icons use rounded strokes (1.7 units on a 24-unit SVG viewBox); the nine-dot mark is a small geometric symbol within a comfortable trigger target.

## Components

- **Weather reading:** a large tabular temperature with a raised degree unit and a simple 64px condition icon. Forecast figures sit beneath a divider. Loading reserves reading space; unavailable weather shows an em dash and hides the forecast. Stale results remain visible with a dated, error-colored status. Status uses a live region; refresh is disabled while loading.
- **Destination row:** a full-width link with a green icon, semibold name, muted description, and trailing arrow. Rows are at least 122px high, or 110px on narrow screens. Hover uses soft green; press uses the deeper pressed tone. The implemented destinations are lazy-diet and lazy-tea.
- **Refresh action:** an icon-only 44px square beside the city, with the original 24px Lucide `refresh-cw` SVG (2-unit stroke) and gently rounded corners. Hover and press use soft and pressed green. Disabled ink is muted with a waiting cursor. The accessible label and tooltip are “Odśwież pogodę” or “Pobieranie pogody…”, while the icon remains visible throughout loading.
- **Launcher trigger:** a 48px square containing a 24px nine-dot mark. Expanded state reverses ink and paper. Its accessible label switches between opening and closing the menu; `aria-expanded` exposes state.
- **Launcher menu:** a paper-colored horizontal strip containing “Start”, the shared destinations, and conditional fullscreen. Items are at least 44px high, with 19px icons. Opening moves focus to Start; Escape closes and restores focus to the trigger; outside pointer input and leaving the launcher with focus also close it. A single 180ms clip reveal uses `cubic-bezier(.16,1,.3,1)` and is removed for reduced motion. Failures appear as a small live status message. The launcher is isolated in an open shadow root.

Dashboard links and buttons have an ink focus outline (3px, offset 5px); launcher controls use the same thickness inset by 4px. The dashboard also supplies a keyboard skip link. Fullscreen labels switch between “Pełny ekran” and “Opuść pełny ekran”; this is a temporary browser capability, not a kiosk lock.

## Do's and Don'ts

- Do keep weather readable and destination links usable during network failures.
- Do use the shared destination list and its Polish descriptions.
- Do preserve visible keyboard focus and reduced-motion support.
- Do use self-hosted Atkinson on the dashboard and system-ui inside the launcher.
- Don't introduce images, decorative cards, or extra destination links without a real product need.
- Don't add a lock control: this extension cannot lock Android.
- Don't present fullscreen when the current document does not support it.
- Don't let launcher styling leak into the host webpage.
