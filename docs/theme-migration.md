# Shared theme migration

## Ownership and compatibility

`@lazy/theme` v0.1.0 owns colors, font files, shared type roles, controls,
destination rows, and focus states. The dashboard owns its weather layout,
responsive columns, Polish copy, and behavior. The launcher keeps Shadow DOM,
system type, fixed pixel sizing, and menu behavior for arbitrary host pages.

The dependency is pinned to the same Git tag as `lazy-tea`, resolving to
`4e03501afe2d0df97eceb3545ba1740f30402e4f`. Build steps copy local assets into both
the extension and website. No runtime CDN or sibling checkout is required.
Generated launcher tokens come from that package, with root selectors scoped
to the shadow host. Page rules never enter an unrelated host document.

## Rollout and rollback

1. Copy package assets and generate the isolated launcher token sheet.
2. Migrate readers to semantic tokens and shared classes; verify light and dark.
3. Build extension 1.1.0 and deploy the website through the existing Pages flow.

The `weather` cache key, value shape, and storage owners do not change. The old
1.0.0 extension and new website can run independently. Keep legacy `/fonts/`
assets during this rollout for cached pages; new CSS loads package fonts.
No stored data or legacy asset URLs are removed in this stage.

Rollback: reinstall the previous `dist/lazy_start-1.0.0.zip` build after signing,
or restore its signed XPI. For the website, roll back to the prior Cloudflare
deployment `c92aa426` in the Pages dashboard. Reverting the migration source
and rebuilding restores the previous UI without changing weather data.

The existing light default remains explicit. Dark compatibility uses the
package's opt-in theme; this migration adds no theme selector or preference.

## Verification

The 13 Node tests, Firefox lint, both artifact builds, and both browser journeys
pass. Browser checks cover light/dark colors, local fonts, three destinations,
48px controls, offline weather, and hostile host-page styles. Desktop, tablet,
320/390px, dark, and enlarged-text captures were reviewed with no material fixes.
Physical Firefox Android compartments and tablet behavior remain unverified.

Pages deployment `3bc59157` is live. Its font assets and legacy font URL were
checked byte-for-byte; the live browser loads package fonts and all three links.
