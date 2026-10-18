import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

// Exercise the deployable output, not a second dashboard implementation.
test('site build serves the dashboard and preserves the signed download without loose extension entry points', () => {
  execFileSync(process.execPath, ['scripts/build-site.mjs']);
  assert.equal(readFileSync('dist/site/index.html', 'utf8'), readFileSync('extension/dashboard.html', 'utf8'));
  assert.equal(readFileSync('dist/site/dashboard.html', 'utf8'), readFileSync('dist/site/index.html', 'utf8'));
  for (const file of ['dashboard.js', 'dashboard.css', 'weather.js', 'links.js', 'launcher.js', 'launcher-theme.js', 'fonts/atkinson-400.ttf', 'fonts/OFL.txt', 'icons/dots.svg', 'icons/LICENSE-lucide.txt', 'vendor/lazy-theme/theme.css', 'vendor/lazy-theme/css/tokens.css', 'vendor/lazy-theme/fonts/atkinson-400.ttf', 'vendor/lazy-theme/fonts/OFL.txt', 'vendor/lazy-theme/LICENSE']) {
    assert.ok(existsSync(`dist/site/${file}`), `Required asset: ${file}`);
  }
  for (const file of ['manifest.json', 'background.js', 'content.js', 'settings.html', 'settings.js', 'settings.css']) {
    assert.equal(existsSync(`dist/site/${file}`), false, `Extension-only file excluded: ${file}`);
  }
  const download = 'downloads/lazy-start-1.3.1.xpi';
  assert.ok(existsSync(`dist/site/${download}`), 'Signed extension is available in a clean site build');
  assert.deepEqual(readFileSync(`dist/site/${download}`), readFileSync(`site/${download}`), 'Signing bytes stay unchanged');
  const headers = readFileSync('dist/site/_headers', 'utf8');
  assert.match(headers, /connect-src https:\/\/api\.open-meteo\.com/);
  assert.match(headers, /script-src 'self';/);
  assert.match(headers, /style-src 'self' 'unsafe-inline';/);
});
