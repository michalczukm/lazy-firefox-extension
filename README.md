# lazy · Start

Firefox page launcher and Gdańsk weather dashboard. Polish UI, English docs.

## Install on Android

For personal use; **no store listing needed**. Firefox 142+ still requires a **Mozilla-signed XPI** for permanent installation.

1. Submit `dist/lazy_start-1.1.0.zip` to [Mozilla Developer Hub](https://addons.mozilla.org/developers/) for unlisted signing. Save the signed XPI on Android.
2. In Firefox, open **Settings > About Firefox**. Tap the Firefox logo **five times**.
3. Return to **Settings > Install Extension from File**. Select the XPI and tap **Add**.

Open a normal website. Tap the nine-dot button, then **Start** for the dashboard.
[Mozilla's installation guide](https://extensionworkshop.com/documentation/publish/install-self-distributed/).

Updates are manual: increase the version in `extension/manifest.json`, rebuild, sign, and install the new XPI.

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

[Standalone dashboard](https://lazy-firefox-extension.pages.dev/). CI deploys `main` and same-repo PR previews. [Setup and commands](docs/deployment.md).

## Notes

- Edit destinations in [extension/links.js](extension/links.js).
- Shared design: [lazy-theme v0.1.0](https://github.com/michalczukm/lazy-theme). [Migration and rollback](docs/theme-migration.md).
- Open-Meteo weather refreshes every 15 minutes while visible. Cached data works offline; no device geolocation.
- No Android homepage override, device lock, or persistent kiosk mode. Firefox blocks injection on protected pages.
- Physical Firefox Android verification remains pending. [Product details](PRODUCT.md) · [Design](DESIGN.md).
- Assets: [Atkinson font license](extension/fonts/OFL.txt) · [Lucide icon sources](https://github.com/lucide-icons/lucide/tree/1ef60af944de207e0d5176905a0759ba12e6ee8d/icons) · [Icon license](extension/icons/LICENSE-lucide.txt).
