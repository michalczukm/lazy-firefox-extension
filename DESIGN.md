---
name: lazy
description: A calm household dashboard and isolated webpage launcher using the shared lazy theme.
colors:
  lazy-color-bg: '#fbfaf5'
  lazy-color-surface: '#fbfaf5'
  lazy-color-ink: '#263d33'
  lazy-color-muted: '#58675c'
  lazy-color-accent: '#59784f'
  lazy-color-on-accent: '#fbfaf5'
  lazy-color-soft: '#e5eadd'
  lazy-color-line: '#cdd5ca'
  lazy-color-focus: '#263d33'
  lazy-color-error: '#8f392b'
  lazy-color-pressed: '#d4dfcd'
  lazy-action-bg: '#263d33'
  lazy-action-hover: '#59784f'
  lazy-action-active: '#263d33'
typography:
  display:
    fontFamily: 'Atkinson Hyperlegible Next, sans-serif'
    fontSize: '5.5rem'
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: '-0.025em'
  headline:
    fontFamily: 'Atkinson Hyperlegible Next, sans-serif'
    fontSize: '2.25rem'
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: '-0.025em'
  heading:
    fontFamily: 'Atkinson Hyperlegible Next, sans-serif'
    fontSize: '1.5rem'
    fontWeight: 600
    letterSpacing: '-0.025em'
  title:
    fontFamily: 'Atkinson Hyperlegible Next, sans-serif'
    fontSize: '1.125rem'
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: 'Atkinson Hyperlegible Next, sans-serif'
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.5
  wordmark:
    fontFamily: 'Atkinson Hyperlegible Next, sans-serif'
    fontSize: '2rem'
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: '-0.035em'
  launcher:
    fontFamily: 'system-ui, sans-serif'
    fontSize: '15px'
    fontWeight: 600
    lineHeight: 1.3
rounded:
  icon: '0.5rem'
  menu-item: '8px'
  launcher: '12px'
spacing:
  '1': '0.25rem'
  '2': '0.5rem'
  '3': '0.75rem'
  '4': '1rem'
  '5': '1.25rem'
  '6': '1.5rem'
  '8': '2rem'
  '12': '3rem'
components:
  weather-reading:
    textColor: '{colors.lazy-color-ink}'
    typography: '{typography.display}'
  destination-row:
    textColor: '{colors.lazy-color-ink}'
    padding: '1.5rem 0.25rem'
  destination-row-hover:
    backgroundColor: '{colors.lazy-color-soft}'
  destination-row-active:
    backgroundColor: '{colors.lazy-color-pressed}'
  refresh-action:
    backgroundColor: '{colors.lazy-color-surface}'
    textColor: '{colors.lazy-color-ink}'
    padding: '0.625rem'
    rounded: '{rounded.icon}'
    width: '3rem'
    height: '3rem'
  launcher-trigger:
    backgroundColor: '{colors.lazy-color-surface}'
    textColor: '{colors.lazy-color-ink}'
    rounded: '{rounded.launcher}'
    padding: '12px'
    width: '48px'
    height: '48px'
  launcher-trigger-expanded:
    backgroundColor: '{colors.lazy-action-bg}'
    textColor: '{colors.lazy-color-on-accent}'
  launcher-menu:
    backgroundColor: '{colors.lazy-color-surface}'
    textColor: '{colors.lazy-color-ink}'
    rounded: '{rounded.launcher}'
    padding: '4px'
---
# Design System: lazy

## Overview

**Creative North Star: "Calm household launcher"**

Warm paper, dark green type, generous breathing room, and prominent weather numbers make lazy easy to read at a glance and comfortable to operate by touch. The dashboard is quiet and flat; the compact launcher floats above ordinary webpages.

The shared `@lazy/theme` package owns the palette, dashboard fonts, type roles, controls and focus states. The app owns composition, density, compact weather metadata and launcher isolation. Use simple geometric SVG icons and retain Polish interface copy.

**Key Characteristics:**

- Warm neutral paper with dark green text by default.
- Shared Atkinson typography, prominent tabular weather numbers and large touch targets.
- Flat dashboard and compact floating launcher with native system type.

## Colors

The frontmatter snapshots the installed package's default light values. Canonical definitions live in `@lazy/theme/css/tokens.css`, upstream at <https://github.com/michalczukm/lazy-theme>. The dependency is pinned to `v0.1.0`, resolved to `4e03501afe2d0df97eceb3545ba1740f30402e4f`. Consume semantic `--lazy-*` properties directly; do not maintain a private palette or alias layer.

### Primary

- **Accent green** (`lazy-color-accent`): destination and weather icons, links and the wordmark dot.
- **Action fill** (`lazy-action-bg`, `lazy-action-hover`, `lazy-action-active`): filled action states, selection and the expanded launcher trigger; pair with `lazy-color-on-accent`.

### Neutral

- **Paper** (`lazy-color-bg`, `lazy-color-surface`): page and control surfaces.
- **Green ink** (`lazy-color-ink`): primary text and neutral controls.
- **Muted green** (`lazy-color-muted`): supporting text and scroll affordances.
- **Soft / pressed sage** (`lazy-color-soft`, `lazy-color-pressed`): neutral hover and press states.
- **Sage line** (`lazy-color-line`): forecast and destination dividers.
- **Focus ink** (`lazy-color-focus`): visible keyboard focus.
- **Brick error** (`lazy-color-error`): stale or unavailable weather status, with explanatory text.

**The Semantic actions Rule.** Use action tokens for filled states; never derive their colors from ink.

The dashboard root explicitly uses `class="lazy-theme" data-lazy-theme="light"`. The package supports opt-in `data-lazy-theme="dark"` with green-charcoal surfaces, warm gold actions and dark on-accent text. This compatibility adds no preference, selector control or OS switching. At mount, the launcher copies the document root's explicit dark mode, otherwise light, to its own host attribute. Its generated tokens remain isolated from the host page.

## Typography

**Display Font:** Atkinson Hyperlegible Next, sans-serif.
**Body Font:** Atkinson Hyperlegible Next, sans-serif.
**Launcher Font:** system-ui, sans-serif.

The package registers local regular, semibold and bold weights (400, 600, 700), with `font-display: swap`; the dashboard disables synthesis. Shared rem roles respect browser font preferences. The launcher retains fixed pixel typography for arbitrary host pages.

The temperature uses the shared regular display role and tabular numerals: (88px) at the default root size, with a smaller raised unit. City uses headline; destination names use heading (24px at default root size). The wordmark is bold; forecast figures are semibold (25px). App-owned condition text is (20px), apparent temperature uses the title size at regular weight, forecast labels are (15px), and status/attribution are (13px). The metadata row wraps directly beneath the city heading.

At widths up to (720px), the city uses the wordmark size, temperature uses `clamp(72px, 21vw, var(--lazy-text-display))`, and units become (28px). Destination names retain the shared heading role.

## Layout

The centered dashboard caps at (1240px), with desktop padding (36px 64px 48px). Weather and destinations use `minmax(0, 1.12fr) minmax(0, 1fr)`, a (96px) gap, and top spacing `clamp(56px, 11vh, 128px)`.

At (1050px) and below, padding becomes (28px 40px 40px) and the column gap (56px). At (720px) and below, sections stack, maximum width becomes (560px), horizontal padding (28px), top spacing (44px), and section gap (48px at default root size). Below (350px), horizontal padding becomes (18px), icons and gaps tighten. The document supports widths down to (280px); content retains natural height with enlarged text.

The launcher sits at the top right, offset by at least (12px) with safe-area insets. Its horizontal menu scrolls within the viewport and stays horizontal on phones. Only the controls accept pointer input, leaving surrounding page content usable.

## Elevation & Depth

The dashboard uses whitespace and fine dividers, with no shadows or raised cards. The launcher trigger, menu and feedback message share the app-owned floating shadow (`0 3px 15px #142b2526`) to separate them from arbitrary host pages. This is the explicit exception to the flat dashboard.

## Shapes

Open sections and straight dividers define the dashboard. Shared icon buttons use the icon radius; launcher shells and menu items keep their fixed pixel radii from frontmatter. General icons use rounded strokes (1.7 units on a 24-unit SVG viewBox); Lucide refresh and basket icons use their original (2-unit) strokes. The nine-dot mark stays small inside its touch target.

## Components

- **Weather reading:** shared display typography, a raised degree unit and a (64px) condition icon, reduced to (48px) below (350px). Loading reserves space; unavailable weather shows an em dash and hides the forecast. Cached stale results remain readable with a dated error-colored live status.
- **Destination row:** shared link-row geometry, semantic state colors and heading typography; app minimum height is (122px), or (110px) on narrow screens. Full-width links contain an accent icon, name, muted description and trailing arrow. The shared list contains lazy-diet, lazy-tea and lazy-list. The latter opens `https://lazy-shopping.michalczukm.xyz/`, describes itself as “Lista zakupów” and uses Lucide shopping-basket. Basket and refresh-cw are ISC-licensed from revision `1ef60af944de207e0d5176905a0759ba12e6ee8d`.
- **Refresh action:** shared icon button, (48px) at the default root size, with a (24px) Lucide refresh-cw icon. Neutral hover and press use package tokens; disabled controls use shared opacity (0.55) and a disabled cursor. Labels are “Odśwież pogodę” and “Pobieranie pogody…”. The icon stays visible while loading.
- **Launcher trigger:** fixed (48px) square with a (24px) nine-dot mark. Expanded state uses action fill and on-accent text. Its accessible label and `aria-expanded` expose state.
- **Launcher menu:** horizontal surface with Start, the shared destinations and conditional fullscreen. Items are at least (48px) high, with (19px) icons. Opening focuses Start; Escape closes and restores trigger focus; outside pointer input and leaving the launcher with focus close it. A single (180ms) clip reveal uses `cubic-bezier(.16,1,.3,1)`; reduced motion removes it. Failures appear in a live status message. Fullscreen labels are “Pełny ekran” and “Opuść pełny ekran”.

Shared dashboard focus uses the package focus color and width (3px), offset (4px). Launcher focus uses the same semantic color and width, inset (4px). Shared dashboard state transitions use (160ms ease-out) and respect reduced motion. The dashboard also includes shared skip navigation. There are no app inputs, cards or chips to document.

`extension/dashboard.html` loads generated `vendor/lazy-theme/theme.css` before app CSS. `scripts/copy-theme.mjs` copies package CSS, fonts and licenses locally for extension and website delivery; it maps only token selectors from `:root` to `:host` for `launcher-theme.js`. Page resets and font rules do not enter the launcher Shadow DOM. Legacy `/fonts/` assets remain for cached-page compatibility; new styles load package fonts. Update the dependency for shared rules and app CSS for composition; do not edit generated assets.

## Do's and Don'ts

### Do:

- Do consume shared semantic tokens, fonts and dashboard component classes from @lazy/theme.
- Do keep weather readable and destination links usable during network failures.
- Do preserve visible keyboard focus, reduced motion and at least 48px control targets at the default root size.
- Do preserve the shared destination list and its Polish descriptions.
- Do keep launcher system type, pixel geometry and host isolation explicit.

### Don't:

- Don't introduce a private palette, duplicate font registrations or generated vendor edits.
- Don't derive filled action colors from ink; preserve package dark compatibility.
- Don't introduce decorative cards or dashboard shadows.
- Don't add unnamed destinations, an Android lock control or unsupported fullscreen actions.
- Don't let launcher styling leak into the host webpage.
