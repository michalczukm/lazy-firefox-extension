# lazy · Start

Firefox page launcher and Gdańsk weather dashboard. Polish UI, English docs.

## Install on Android

For personal use; **no store listing needed**. Firefox 142+ still requires a **Mozilla-signed XPI** for permanent installation.

1. Download the [Mozilla-signed extension](https://lazy.michalczukm.xyz/firefox-extension) and save the `.xpi` on Android.
2. In Firefox, open **Settings > About Firefox**. Tap the Firefox logo **five times**.
3. Return to **Settings > Install Extension from File**. Select the XPI and tap **Add**.

Open a normal website. Tap the nine-dot button, then **Start** for the dashboard.
[Mozilla's installation guide](https://extensionworkshop.com/documentation/publish/install-self-distributed/).

Updates are manual: rebuild and sign a new version, [publish the signed file](docs/deployment.md#signed-extension-download), then download and install the new XPI.

## Develop

Requires Node.js 22+, pnpm 11.8, and Python 3.

```sh
pnpm install
pnpm verify   # Tests, lint, unsigned ZIP in dist/
pnpm dev     # Dashboard preview
```

[Preview](http://127.0.0.1:4198/dashboard.html). Browser checks: `pnpm test:browser` requires `agent-browser` and Chromium.
Desktop Firefox 140+: open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, select `extension/manifest.json`.

## Hosting

[Standalone dashboard](https://lazy.michalczukm.xyz/). CI deploys `main` and same-repo PR previews. [Setup and commands](docs/deployment.md).

## Notes

- Add personal links through **Ustawienia** (cog). [Guide](docs/custom-links.md). Built-ins stay in [extension/links.js](extension/links.js).
- With extension 1.3.1, normal app taps search across Firefox tabs, preserving the matched tab's route and state. Normal and private tabs stay separate; a match in the current window is preferred, and desktop windows are focused when supported. This also handles Android's one-window-per-tab model. Missing apps open in new tabs. **Start** and the toolbar action reuse a dashboard tab or open `https://lazy.michalczukm.xyz/`. Matching uses the exact origin (scheme, host and port); custom links on the same origin share a tab. Modified clicks retain Firefox's native behavior. Existing duplicates are not closed.
- The `tabs` permission lets the background script read open-tab URLs locally for matching. URLs are not uploaded. Without a compatible extension, the website keeps ordinary link navigation.
- Shared design: [lazy-theme v0.1.0](https://github.com/michalczukm/lazy-theme). [Migration and rollback](docs/theme-migration.md).
- Open-Meteo weather refreshes every 15 minutes while visible. Cached data works offline; no device geolocation.
- Fullscreen is manual: choose **Pełny ekran** in the menu. Page taps never restore it automatically after navigation.
- No Android homepage override, device lock, or persistent kiosk mode. Firefox blocks injection on protected pages.
- Physical Firefox Android verification remains pending. [Product details](PRODUCT.md) · [Design](DESIGN.md).
- Assets: [Atkinson font license](extension/fonts/OFL.txt) · [Lucide icon sources](https://github.com/lucide-icons/lucide/tree/1ef60af944de207e0d5176905a0759ba12e6ee8d/icons) · [Icon license](extension/icons/LICENSE-lucide.txt).
