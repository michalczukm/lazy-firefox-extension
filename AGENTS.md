# Repository Guidelines

## Project Structure & Module Organization

- `extension/` contains the Firefox manifest, background script, injected launcher, dashboard, settings, fonts, and icons. Built-in links and validation live in `links.js`; weather logic lives in `weather.js`.
- `tests/*.test.js` contains Node.js tests; `scripts/` contains browser checks and build tooling.
- `site/_headers` configures hosted dashboard security headers. `dist/` holds generated ZIP and site output.
- `docs/` covers deployment, custom links, and theme migration. Read `PRODUCT.md` for behavior and `DESIGN.md` before interface changes.

## Build, Test, and Development Commands

Requires Node.js 22+, pnpm 11.8, and Python 3.

- `pnpm install --frozen-lockfile`: install pinned dependencies.
- `pnpm dev`: generate theme assets and serve the preview at `http://127.0.0.1:4198/dashboard.html`.
- `pnpm verify`: run Node tests, Firefox lint, extension packaging, and site build.
- `pnpm test:browser`, `pnpm test:site`, `pnpm test:settings`: check browser behavior using `agent-browser` and Chromium.
- `pnpm build`: create an unsigned extension ZIP in `dist/`.
- `pnpm build:site`: generate the public dashboard in `dist/site/`.

## Coding Style & Naming Conventions

Follow existing vanilla JavaScript: two-space indentation, single quotes, semicolons, and camelCase identifiers. Use kebab-case filenames and CSS classes. Keep UI text Polish and documentation English. Reuse shared `@lazy/theme` tokens and Lucide icons. Regenerate `extension/vendor/` and `launcher-theme.js` through `pnpm build:theme`; these are generated assets. Firefox lint uses `web-ext`; no formatter is configured.

## Testing Guidelines

Use `node:test` and strict assertions; name files `*.test.js` with descriptive behavior cases. No coverage threshold is configured. Cover changed behavior, especially URL validation, storage concurrency, and authorization. Run `pnpm verify` before submitting; run relevant browser checks for UI changes. Chromium fixtures do not establish Firefox Android compatibility; disclose device verification gaps.

## Commit & Pull Request Guidelines

Use imperative, scoped-purpose prefixes found in history: `feat:`, `docs:`, and `chore:`. Describe behavior, validation, and limitations in PRs; link relevant issues and include desktop/mobile screenshots for UI changes. CI verifies PRs and deploys same-repository previews; pushes to `main` deploy production.

## Security & Agent Operations

Keep custom-link writes in the background script with sender validation and serialized storage updates. Preserve the hosted bridge’s origin restrictions. Keep credentials out of Git; deployment setup is in `docs/deployment.md`.

Use `agent-browser` or Chrome DevTools MCP for autonomous browser verification. Open pages for the user with the system-default browser (`open <url>` on macOS).
