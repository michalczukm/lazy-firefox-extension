import { cp, copyFile, mkdir, rm } from 'node:fs/promises';
import './copy-theme.mjs';

const source = new URL('../extension/', import.meta.url);
const output = new URL('../dist/site/', import.meta.url);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

// Publish only dashboard assets. Extension entry points stay in the ZIP.
for (const file of ['dashboard.html', 'dashboard.css', 'dashboard.js', 'weather.js', 'links.js', 'launcher.js', 'launcher-theme.js', 'vendor', 'fonts', 'icons']) {
  await cp(new URL(file, source), new URL(file, output), { recursive: true });
}
// Keep dashboard.html for existing Home links; index.html serves the site root.
await copyFile(new URL('dashboard.html', source), new URL('index.html', output));
await copyFile(new URL('../site/_headers', import.meta.url), new URL('_headers', output));
console.log('Dashboard built in dist/site');
