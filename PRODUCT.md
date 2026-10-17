# lazy-firefox-extension

<!-- impeccable:product-schema 1 -->

## Platform

web

Firefox WebExtension, primarily used on an Android tablet.

## Users and Purpose

A personal, touch-operated launcher for a device used as a household kiosk.
Reach a small set of fixed websites from any ordinary webpage and check
the weather in Gdańsk without opening another service.
The owner is the only user. Manual installation and updates are acceptable;
no public add-on store listing or automated distribution is required.

## Confirmed Capabilities

- A nine-dot button fixed in the top-right corner of ordinary HTTP/HTTPS
  pages, including websites outside the fixed destination list.
- A horizontal menu of fixed links, shared with a dashboard.
- Confirmed destinations: `https://lazy-diet.workers.dev/`,
  `https://lazy-tea.pages.dev/`, and `https://lazy-shopping.michalczukm.xyz/`
  (label `lazy-list`). The user originally envisaged four or five;
  additional destinations remain unnamed and must not be fabricated.
- Dashboard: Gdańsk weather on the left and large destination links on the right.
- Current temperature, condition, apparent temperature, today's high/low,
  and precipitation probability, supplied by Open-Meteo at fixed coordinates.
- Refresh weather every 15 minutes while visible; retain the last result
  and identify old data when fresh weather is unavailable.
- A menu action opens the dashboard; an optional fullscreen toggle acts
  on the current webpage.
- The same dashboard is also a standalone Cloudflare Pages website. GitHub
  Actions verifies changes, deploys `main`, and deploys same-repository PR previews.
  Production URL: `https://lazy-firefox-extension.pages.dev/`.
- All interface text is Polish.
- All documentation is English. Quoted interface labels retain their Polish wording.

## Weather and Privacy

Open-Meteo receives requests for fixed Gdańsk coordinates (54.352, 18.6466),
without an API key or device geolocation. Values use Celsius and Europe/Warsaw.
Precipitation probability is the daily maximum. Failed requests retain the last
valid result with its timestamp; previous-day forecasts show their actual date.

The extension stores weather locally in `browser.storage.local`; the standalone
website and development preview use `localStorage`. It does not transmit page contents, browsing history,
or device location. There are no accounts, analytics, or remote scripts.

## Installation and Verification

Desktop Firefox requires version 140+; Android requires 142+. Desktop temporary
installation ends when Firefox restarts. Normal permanent installation requires
a Mozilla-signed XPI; the local build produces an unsigned ZIP. This project
does not publish automatically or use a Mozilla account.
Use Mozilla's unlisted signing route, then install the signed XPI manually.
Signing does not require a public store listing. Updates follow the same
manual process after increasing the extension manifest version.

Browser checks use Chromium and synthetic weather through agent-browser.
They do not replace installation and critical-path checks on the target Android
tablet. Test navigation, dashboard access, offline weather, and fullscreen there.

## Constraints

- Firefox Android cannot replace its homepage/new-tab page through the
  standard extension override APIs. Dashboard access comes from the menu.
- Firefox forbids injection into privileged pages, its PDF viewer,
  other extensions, and some Mozilla domains.
- Host pages can remove injected DOM elements; the launcher is not an Android
  system overlay.
- Fullscreen is temporary and may end on navigation, tab changes, or
  switching apps. It does not enforce kiosk mode.
- Android device locking requires a separate native component with
  appropriate device administrator privileges. The extension alone cannot
  provide a working lock button; omit that control from this version.
- No device geolocation, backend, or framework is needed. Cloudflare Pages
  hosts only static dashboard assets; extension entry points stay in the ZIP.

## Approved Design Direction

The user accepted a warm neutral background, dark green text, prominent
weather numbers, and large touch targets. Two columns on a tablet, stacked
on narrow screens. The nine-dot mark stays visually small within a comfortable
touch target. Impeccable governs UI craft.

The user requested migration to `https://github.com/michalczukm/lazy-theme`.
Use `@lazy/theme` pinned to v0.1.0 for shared colors, local Atkinson fonts,
components, and focus states. The light default remains explicit; dark is opt-in
package compatibility, with no new preference or selector. Dashboard composition
and launcher isolation remain app-owned. See [migration notes](docs/theme-migration.md).

## Product Principles

- One destination list owns navigation across both surfaces.
- Ordinary page content stays usable around the launcher.
- Network failure must leave navigation and cached weather available.
- Do not promise browser or Android capabilities unavailable to an extension.
