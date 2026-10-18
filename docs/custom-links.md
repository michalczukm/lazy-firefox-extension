# Custom browser links

Open **Ustawienia** in the nine-dot menu, or use the cog beside **Twoje strony**.
Enter a name and full HTTP/HTTPS URL, then choose **Dodaj stronę**. Use **Usuń**
to remove a custom link. Every custom link has the same fixed Lucide cog icon;
there is no icon setting. The three built-in links remain fixed.

Links belong to the current Firefox profile, not a Cloudflare account or other
devices. They update in existing menus and the packaged dashboard. With extension
1.3.0 installed, they also appear on `https://lazy.michalczukm.xyz/`, the project's
Pages address and previews.
The hosted page shows its settings control only after the extension connects.

## Storage and boundaries

The background script is the sole writer of `browser.storage.local.customLinks`.
Its value is an ordered array of `{ id, label, url }`; IDs are UUIDs. Names are
limited to 80 characters, URLs to 2048. URLs are normalized, require HTTP/HTTPS,
and cannot contain credentials. Duplicate URLs are rejected. Icons are derived,
never accepted from input or saved. The existing `weather` key is untouched.

Writes are serialized across settings tabs. Only the extension's own settings
page can add or remove links. Corrupt data and failed writes produce errors
without overwriting the saved list. Built-in links are never stored as editable
data. Custom labels render as text; URLs pass validation before becoming links.

Menus on unrelated websites use a closed Shadow DOM so page scripts cannot read
the saved URLs. The hosted dashboard receives string-encoded, validated data
through a local page/content-script bridge. The bridge runs only on HTTPS
`lazy.michalczukm.xyz`, `lazy-firefox-extension.pages.dev` and the project's preview
subdomains, at dashboard paths. It can request links, open extension settings,
request tab navigation, or exchange the boolean fullscreen-restoration preference;
it cannot write links. Navigation accepts only configured
destination URLs or the fixed dashboard action, never arbitrary page-supplied URLs.
The bridge advertises navigation support so older extensions retain ordinary links.
No custom URLs are uploaded to Cloudflare or synchronized to other browsers.

## Verification and compatibility

`pnpm test` covers URL validation, writer authorization, concurrent updates,
idempotent removal, storage failures, and bridge origin restrictions.
`pnpm test:settings` runs the shipped background code behind a browser-API
fixture and checks the Polish form, persistence, errors, menu, both dashboards,
fixed cog, live updates, closed-root privacy, and accessibility.

The browser fixture does not replace testing a signed extension on Firefox
Android. Upgrade the extension manually to 1.3.0 for custom-domain support and tab reuse. Older versions
continue using the built-in links; no weather or link data is migrated or erased.
