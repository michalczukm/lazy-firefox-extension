# Firefox launcher and weather dashboard

## Intent and scope

Build a small Firefox extension for a touch-operated Android tablet. The
user approved the dashboard proposal on 2026-10-18 and requires a Polish UI.
The extension provides navigation on ordinary webpages and a local dashboard.
Persistent kiosk enforcement and native Android locking are outside its capabilities.

## Observable behavior

1. Every permitted top-level HTTP/HTTPS page receives one nine-dot button
   at its top-right, with a 48 px touch target and an accessible Polish name.
   It also appears on the dashboard, which renders its own launcher.
2. Tapping the button toggles a horizontal link strip. At narrow widths the
   strip scrolls horizontally without widening the page. Escape or tapping
   outside closes it; keyboard focus remains visible and returns to the
   trigger when closing with Escape.
3. The strip contains `Start`, `lazy-diet`, `lazy-tea`, and a fullscreen
   action. Links navigate in the current tab. Destination URLs are fixed:
   `https://lazy-diet.workers.dev/` and `https://lazy-tea.pages.dev/`.
   Additional requested slots wait for real destinations; no dead links.
4. `Start` opens the packaged dashboard in the current tab. The Firefox
   extension toolbar action offers a second route to it.
5. `Pełny ekran` requests document fullscreen directly from the tap.
   `Opuść pełny ekran` exits it. Rejection produces a short Polish message;
   unsupported contexts do not pretend fullscreen is available. No automatic
   re-entry or fullscreen persistence across navigation is promised.
6. Dashboard left: `Gdańsk`, current temperature and condition, apparent
   temperature, today's high/low and precipitation probability. Dashboard
   right: large links to the same destinations. On narrow screens weather
   precedes the links. Navigation never waits for weather.
7. Fetch Open-Meteo weather for fixed Gdańsk coordinates using Celsius,
   a Europe/Warsaw timezone, and WMO condition codes translated into Polish.
   Show loading, fresh, cached/stale, and unavailable states distinctly.
   Unknown condition codes have a neutral fallback. Attribution links to
   Open-Meteo. No fabricated live weather or silent zero-value fallbacks.
8. Cache the validated response and fetch timestamp locally. Refresh on
   opening/returning when older than 15 minutes, then every 15 minutes while
   visible. Coalesce overlapping requests; bound network requests with a
   timeout. On failure retain useful cached data and show its timestamp;
   with no cache show a retry control and a clear Polish error.

## Ownership and implementation

Use ordinary HTML, CSS, JavaScript and Firefox WebExtension APIs, without
a framework or build pipeline. The package is directly loadable by Firefox.

- Manifest owns injection scope, permissions, extension identity and entry points.
- A shared fixed destination list owns URLs and labels for both surfaces.
- Launcher code owns its isolated DOM, menu interaction and fullscreen action.
  Inject into the top frame only; use Shadow DOM to isolate styles and avoid
  styling the host website. Use native buttons, links and navigation semantics.
- A small background handler owns opening the known dashboard URL for
  content-script messages and the toolbar action. No caller-supplied URL,
  script execution, cross-origin proxy or arbitrary privileged commands.
- Dashboard HTML/CSS owns weather/link presentation; weather logic owns
  request construction, response validation, cache freshness and conditions.

Content-script access to all ordinary websites is required by the requested
launcher scope. Weather requests go only to Open-Meteo. No geolocation,
history, cookies, downloads, native messaging or device administration.
Untrusted API strings are rendered as text, never HTML. Locally packaged
scripts obey extension CSP; no remote scripts, fonts or runtime dependencies.

## Visual direction

Operate mode: calm and legible at arm's length. Warm paper, dark green ink,
large tabular weather numerals, clear horizontal rules and generous touch
targets. A quiet two-column dashboard puts weather left and destinations
right. No decorative dashboard widgets or nonfunctional device-lock button.
The launcher is compact against unrelated sites and expands into a readable
horizontal strip. Respect reduced motion and safe-area insets.

## Limits and non-goals

- No native Android lock: it requires a separate app with device-admin
  privileges, explicitly enabled by the user. No misleading lock control.
- No persistent kiosk mode or Android system UI control.
- No Android homepage/new-tab override, startup redirection workaround,
  injected button on browser-internal/restricted pages, or global floating UI.
- No settings editor, user-defined destinations, accounts, sync, forecast
  charts, geolocation or separate hosting.
- Signing/distribution and physical Firefox Android verification remain
  explicit release steps; this machine has desktop Firefox but no adb or
  attached Android test environment.

## Acceptance proof

- Node's built-in tests cover response validation, condition mapping, cache
  freshness and weather failure behavior; no new test framework.
- Validate the manifest/package with web-ext lint, including Android support.
- Use agent-browser or Chrome DevTools for local dashboard and injection
  interaction checks: toggle, outside/Escape close, destination links,
  fullscreen errors, weather loading/failure and narrow-width overflow.
- Capture desktop/tablet and narrow-screen views together, inspect once,
  batch material fixes, and confirm at most once before the Impeccable finish
  review. Browser simulation does not claim real Firefox Android verification.
- Provide a packaged extension and concise English install/use instructions
  that explain signing and Android limitations.

## Workflow status

- [x] Inspect empty project and sibling destination evidence.
- [x] Confirm core behavior, Polish interface and accepted visual direction.
- [x] Triage fullscreen, Android homepage and device-lock limitations.
- [x] Write and self-review this specification.
- [x] User accepts the in-chat design and explicitly authorizes implementation;
  this written record captures that scope.
- [x] Record implementation plan and execute inline in the supplied directory.
- [x] Implement, verify, visually review and package the extension.

## Verification outcome

`pnpm verify` passed: 12 Node tests, web-ext lint with zero errors/notices/
warnings, and packaged `dist/lazy_start-1.0.0.zip`. `pnpm test:browser` passed
with 1440, 1024, 390 and 320 px viewports, isolated launcher, menu focus,
fullscreen rejection, weather cache/offline states and zero axe violations.
The timing regression verifies a 14-minute cache schedules refresh within
one minute. API timestamp regressions reject impossible times/dates.

Live Open-Meteo weather was also displayed in the local preview. Four valid
screenshots were inspected and recaptured after fixes. The independent
Impeccable reviewer scored both material fixes resolved, disposition `ship`
at that scope. The cream-palette detector warning is accepted because the
user approved that palette. Signing and physical Firefox Android acceptance
remain release steps, not claims made by these checks.
