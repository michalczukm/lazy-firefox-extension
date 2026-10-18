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
  Production URL: `https://lazy.michalczukm.xyz/`.
- All interface text is Polish.
- All documentation is English. Quoted interface labels retain their Polish wording.
- Settings add or remove named HTTP/HTTPS links in this Firefox profile. Custom
  links use one fixed cog icon; built-ins remain immutable. Existing menus and
  both dashboards update from extension storage. The hosted dashboard requires
  the installed extension and receives data through a restricted local bridge.
- Normal destination taps in either dashboard or the injected menu activate an
  existing tab on the same origin in the current Firefox window, preserving its
  URL and state. If none exists, create a tab without replacing the dashboard or
  current app. Start and the toolbar action reuse a hosted or packaged dashboard
  tab, otherwise create `https://lazy.michalczukm.xyz/`. Rapid requests are serialized.
  Modified clicks retain native behavior; pre-existing duplicates stay open.

## Weather and Privacy

Open-Meteo receives requests for fixed Gdańsk coordinates (54.352, 18.6466),
without an API key or device geolocation. Values use Celsius and Europe/Warsaw.
Precipitation probability is the daily maximum. Failed requests retain the last
valid result with its timestamp; previous-day forecasts show their actual date.

The extension reads open-tab URLs locally using the `tabs` permission to match
destinations; it does not upload them or use the browsing-history API.
The extension stores weather locally in `browser.storage.local`; the standalone
website and development preview use `localStorage`. It does not transmit page contents, browsing history,
or device location. There are no accounts, analytics, or remote scripts.
Custom links use a separate `customLinks` key in extension storage. Only the
extension settings page can write them; the hosted dashboard has no write API.
Unrelated page scripts cannot inspect the injected menu's closed Shadow DOM.

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
- Mozilla documents partial `tabs.query()` support on Firefox Android: some open
  tabs may be omitted. Tab reuse needs signed-extension checks on the target tablet,
  including background/restored tabs. Chromium fixtures cannot establish this.
- Start opens the hosted dashboard when none is open, which requires network
  access for its first load. The bundled dashboard remains available directly.
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
