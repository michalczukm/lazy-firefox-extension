# Cloudflare Pages deployment

The standalone dashboard uses the same HTML, CSS, JavaScript, fonts, and icons
as the extension. `pnpm build:site` copies only dashboard assets into `dist/site`.
Both `/` and `/dashboard` open the dashboard. No backend or API key is needed.
The hosted page caches weather in `localStorage` instead of extension storage.
Both builds copy the pinned `@lazy/theme` package locally. The website and
extension include its CSS, fonts, and license; no runtime CDN is used.

Live site: https://lazy-firefox-extension.pages.dev/

## GitHub setup

The workflow follows `../lazy-tea`: Node.js 22, pnpm 11.8, frozen installs,
verification before deployment, production on `main`, and same-repository PR
previews. It deploys the exact files built and checked in the same job.
Fork PRs run checks without deployment credentials.

1. Push this repository to GitHub, with `main` as the production branch.
2. Add these repository **Actions secrets**:
   - `CLOUDFLARE_ACCOUNT_ID`: the account containing the Pages project.
   - `CLOUDFLARE_API_TOKEN`: a token with **Account / Cloudflare Pages / Edit**
     permission for that account, as in `lazy-tea`.
3. Push to `main` or open a PR. The CI log reports the deployment URL.

Only trusted contributors should push branches to this repository: same-repo
PRs can deploy with the Pages token. Fork PRs cannot.

The Pages project is `lazy-firefox-extension`, with production branch `main`.
For a new account, create it once:

```sh
pnpm exec wrangler login
pnpm exec wrangler pages project create lazy-firefox-extension --production-branch main --force
```

The one-time `--force` selects the Pages project model used by `lazy-tea`,
bypassing Wrangler's automatic new-project migration to Workers. Existing
Pages projects deploy normally without that flag.

## Local checks and manual deployment

```sh
pnpm verify
pnpm test:site
pnpm exec wrangler pages dev dist/site --ip 127.0.0.1 --port 4199
pnpm run deploy
```

`pnpm test:site` runs the browser journey against the built website with its
security headers, using agent-browser and Chromium. It checks root/Home
navigation, weather and offline states, responsive layout, and launcher reuse.
Real Firefox Android extension compartments still need device verification.

The security policy permits weather requests only to Open-Meteo. Scripts are
same-origin; inline styles support the shared Shadow DOM launcher. Extension
entry points and manifest are excluded from the public website build.

The CI does not sign, publish, or install the Firefox extension. Those operations
remain manual and independent of website deployment.
