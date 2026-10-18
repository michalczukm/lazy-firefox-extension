# Cloudflare Pages deployment

The standalone dashboard uses the same HTML, CSS, JavaScript, fonts, and icons
as the extension. `pnpm build:site` copies dashboard assets and the signed release
download into `dist/site`.
Both `/` and `/dashboard` open the dashboard. No backend or API key is needed.
The hosted page caches weather in `localStorage` instead of extension storage.
Both builds copy the pinned `@lazy/theme` package locally. The website and
extension include its CSS, fonts, and license; no runtime CDN is used.

Live site: https://lazy.michalczukm.xyz/

The Pages project address `https://lazy-firefox-extension.pages.dev/` and its
preview subdomains remain trusted dashboard aliases. The extension uses the
custom domain for new dashboard tabs. Website deployment and extension upgrades
are independent: a website used without extension 1.3.0 retains ordinary links.

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

The CI publishes the checked-in signed extension alongside the website. It does
not sign or install extensions; signing remains a manual Mozilla submission.

## Signed extension download

`https://lazy.michalczukm.xyz/firefox-extension` redirects with HTTP 302 to the
latest published signed XPI, currently `/downloads/lazy-start-1.3.1.xpi`.
This is a static Pages download, with attachment headers and an immutable,
versioned filename. No R2 bucket or Pages Function is needed.

To publish a new extension version:

1. Increase the version in `extension/manifest.json` and `package.json`, run
   `pnpm verify`, and submit the resulting ZIP to Mozilla for unlisted signing.
2. Download the signed XPI and copy it unchanged to
   `site/downloads/lazy-start-<version>.xpi`. Never unzip, edit, or repack it.
3. Update `site/_redirects` to point `/firefox-extension` at that file. Retain old
   versioned files, and never replace an existing version's bytes.
4. Update the signed-download fixture path in `tests/site.test.js`, run
   `pnpm verify`, commit the signed file and routing change, then deploy.

The site build copies checked-in signed files byte for byte. It never publishes
the unsigned ZIP from `dist/` as the installable download. The signed release can
remain on an older version while new extension source changes await signing.
On Android, save the XPI and use Firefox's **Install Extension from File** flow
described in the [README](../README.md#install-on-android).

The hosted dashboard's custom links come from the installed extension's local
profile. They are not deployment data or Cloudflare secrets. See the
[custom-link settings guide](custom-links.md).
