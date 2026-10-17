import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const source = new URL('.', import.meta.resolve('@lazy/theme'));
const target = new URL('../extension/vendor/lazy-theme/', import.meta.url);
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
for (const asset of ['theme.css', 'fonts.css', 'css', 'fonts', 'LICENSE']) {
  await cp(new URL(asset, source), new URL(asset, target), { recursive: true });
}

// Only tokens enter the Shadow DOM; page resets and font rules stay in the dashboard.
const tokens = await readFile(new URL('css/tokens.css', source), 'utf8');
const shadowTokens = tokens
  .replaceAll(":root[data-lazy-theme='dark']", ":host([data-lazy-theme='dark'])")
  .replaceAll(':root', ':host');
if (!shadowTokens.includes(":host([data-lazy-theme='dark'])")) {
  throw new Error('The shared theme token selectors changed; review the Shadow DOM mapping.');
}
await writeFile(new URL('../extension/launcher-theme.js', import.meta.url),
  '// Generated from @lazy/theme tokens by scripts/copy-theme.mjs. Do not edit.\n' +
  `globalThis.LAZY_LAUNCHER_TOKENS = ${JSON.stringify(shadowTokens)};\n`);
