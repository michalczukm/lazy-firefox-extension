# Firefox Launcher Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship a Polish page launcher and packaged Gdańsk weather dashboard.

**Architecture:** A shared destination list and Shadow DOM launcher serve content
scripts and the local dashboard. A background handler opens only the packaged
dashboard; weather fetching, validation and caching stay in a dashboard module.

**Tech stack:** Firefox Manifest V2, native HTML/CSS/JavaScript, Node test runner,
web-ext for packaging/linting. No runtime dependencies.

**Spec:** ../specs/2026-10-18-firefox-launcher-design.md

## Global constraints

- Polish UI; fixed Gdańsk coordinates; Celsius; Europe/Warsaw.
- Same-tab navigation; two confirmed links, no invented destinations.
- 15-minute weather freshness; cached data and errors remain understandable.
- No native locking, persistent kiosk mode or Android homepage override.
- Preserve touch, keyboard, narrow-screen and reduced-motion accessibility.

## Review focus

- Missing/null API values must never become zero-degree weather.
- Cached data from another day must not masquerade as today's forecast.
- A failed weather request must leave navigation usable.
- Page CSS and narrow viewports must not break the launcher or page layout.
- Messages must not allow arbitrary privileged navigation.

## Task 1: Weather data path

Files: `extension/weather.js`, `tests/weather.test.js`, `package.json`.

Interfaces: `parseWeather(raw)`, `conditionLabel(code)`,
`isFresh(entry, now)`, `loadWeather({storage, fetcher, now, force})`.

- [x] Write and run failing tests for validation, unknown codes, freshness,
  fetch caching, stale fallback, request coalescing and unavailable weather.
- [x] Implement fixed URL, bounded fetch, validated cache and failure states.
- [x] Run `node --test tests/weather.test.js` and confirm all pass.

## Task 2: Complete extension UI

Files: `extension/manifest.json`, `links.js`, `launcher.js`, `content.js`,
`background.js`, `dashboard.html`, `dashboard.js`, `dashboard.css`, `icons/`.

Interfaces: `LazyLauncher.mount({onHome})`; content sends only
`{type: 'open-dashboard'}`; background resolves its own dashboard URL.

- [x] Add launcher/background checks using Node's VM and browser verification.
- [x] Build isolated horizontal launcher with Escape/outside close/fullscreen.
- [x] Build responsive Polish weather dashboard with shared destination links.
- [x] Prove URL/message boundaries, duplicate injection and fullscreen failure.

## Task 3: Verify and package

Files: `README.md`, package scripts, Impeccable design artifacts.

- [x] Run unit tests, syntax checks, `web-ext lint` and package build.
- [x] Serve local dashboard; use agent-browser for touch-sized/narrow layouts,
  weather fresh/failure states, menu interaction, screenshots and accessibility.
- [x] Run Impeccable detector once; batch material corrections; finish review.
- [x] Record actual proof, Android/signing limits and English install instructions.

## Execution ledger

Ruling: Execute inline in the supplied empty project directory. The user's
“do it” authorizes implementation of the accepted proposal; no unrelated
checkout or separate worktree is needed. No git repository exists yet.

Ruling: Use the accepted paper/green Operate direction and code-led build;
preserve the approved two-column structure instead of reopening art direction.
Impeccable seed 7ececfb7 assigns candidate 4; the pinned user-approved direction
takes precedence. No workflow default is stored without a user choice.

Preflight: Task 2 imports Task 1's normalized weather/status output. Both
dashboard and content scripts consume the same fixed links and launcher.
Background navigation uses a constant internal URL, never a caller URL.

Task 1: complete — weather tests RED→GREEN; later timestamp regression
RED→GREEN. Task 2: complete — URL/message tests RED→GREEN and browser
interaction proof. Task 3: complete — `pnpm verify` and `pnpm test:browser`
pass; four screenshots reviewed. Independent finish reviewer scored both
refresh timing and timestamp fixes resolved (`ship` at that scope).

Ruling: Replace load-anchored interval with savedAt-based timeout after
review demonstrated a nearly 30-minute refresh gap on foreground return.

Ruling: Use web-ext 10.8.0, the current compatible development tool, after
9.0.0 pulled an obsolete spawn-sync build dependency. Frozen installation
uses no runtime dependencies or executable dependency build hooks.
