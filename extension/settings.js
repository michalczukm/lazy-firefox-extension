import './links.js';
import './launcher.js';

const $ = id => document.getElementById(id);
const form = $('add-link');
const fields = $('link-fields');
const status = $('settings-status');
let busy = false;
let loaded = false;

function message(text, error = false, field) {
  status.textContent = text; status.dataset.error = String(error);
  for (const name of ['label', 'url']) $('link-' + name).removeAttribute('aria-invalid');
  if (field === 'label' || field === 'url') {
    $('link-' + field).setAttribute('aria-invalid', 'true'); $('link-' + field).focus();
  }
}
function render(customLinks) {
  const links = globalThis.LazyLinks.readStored(customLinks);
  $('empty-links').hidden = links.length !== 0;
  $('custom-links').replaceChildren(...links.map(link => {
    const row = document.createElement('li');
    const copy = document.createElement('span');
    const name = document.createElement('span'); name.className = 'custom-name'; name.textContent = link.label;
    const url = document.createElement('span'); url.className = 'custom-url'; url.textContent = link.url;
    copy.append(name, url);
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'lazy-button';
    remove.textContent = 'Usuń'; remove.disabled = busy;
    remove.setAttribute('aria-label', `Usuń stronę ${link.label}`);
    remove.addEventListener('click', () => mutate({ type: 'remove-custom-link', id: link.id }));
    row.append(globalThis.LazyLauncher.icon('settings'), copy, remove); return row;
  }));
}
async function request(payload) {
  const result = await browser.runtime.sendMessage(payload);
  if (!result?.ok) {
    const error = new Error(result?.error || 'Nie udało się zapisać zmian. Spróbuj ponownie.');
    error.field = result?.field; throw error;
  }
  return result;
}
async function load() {
  try {
    const result = await request({ type: 'get-custom-links' });
    render(result.customLinks); loaded = true; fields.disabled = busy;
    if (!busy) message('');
  } catch { message('Nie można wczytać zapisanych stron. Odśwież kartę i spróbuj ponownie.', true); }
}
async function mutate(payload) {
  if (busy || !loaded) return;
  busy = true; fields.disabled = true;
  document.querySelectorAll('#custom-links button').forEach(button => { button.disabled = true; });
  try {
    const result = await request(payload);
    if (payload.type === 'add-custom-link') form.reset();
    busy = false; fields.disabled = false; render(result.customLinks);
    message(payload.type === 'add-custom-link' ? 'Dodano stronę.' : 'Usunięto stronę.');
    $('link-label').focus();
  } catch (error) { fields.disabled = false; message(error.message, true, error.field); }
  finally {
    busy = false; fields.disabled = !loaded;
    document.querySelectorAll('#custom-links button').forEach(button => { button.disabled = false; });
  }
}
form.addEventListener('submit', event => {
  event.preventDefault();
  try {
    const link = globalThis.LazyLinks.normalizeInput({ label: $('link-label').value, url: $('link-url').value });
    mutate({ type: 'add-custom-link', ...link });
  } catch (error) { message(error.userMessage || 'Sprawdź nazwę i adres strony.', true, error.field); }
});
if (globalThis.browser?.runtime?.sendMessage) {
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && Object.hasOwn(changes, 'customLinks') && !busy) load();
  });
  load();
} else {
  message('Otwórz ustawienia przez rozszerzenie Firefoksa.', true);
}
