// ── Language toggle: PL ↔ EN ──────────────────────────────────────────────
// EN content is embedded in the page as <script id="i18n-en" type="application/json">.
// PL content is snapshotted from the server-rendered DOM on first load.

type Lang = 'pl' | 'en';

function flatten(obj: unknown, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof obj !== 'object' || obj === null) return out;
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') {
      out[key] = v;
    } else if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (typeof item === 'string') {
          out[`${key}.${i}`] = item;
        } else {
          Object.assign(out, flatten(item, `${key}.${i}`));
        }
      });
    } else if (typeof v === 'object') {
      Object.assign(out, flatten(v, key));
    }
  }
  return out;
}

// Read embedded EN content
const enEl = document.getElementById('i18n-en');
const enFlat = enEl ? flatten(JSON.parse(enEl.textContent ?? '{}')) : {};

// Snapshot PL from server-rendered DOM (must run before any swap)
const plSnapshot: Record<string, string> = {};
document.querySelectorAll<HTMLElement>('[data-i18n]').forEach(el => {
  plSnapshot[el.dataset.i18n!] = el.textContent ?? '';
});

function getLang(): Lang {
  return (localStorage.getItem('dk-lang') as Lang) ?? 'pl';
}

function applyLang(lang: Lang) {
  const map = lang === 'en' ? enFlat : plSnapshot;
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n!;
    if (key in map) el.textContent = map[key];
  });
  document.querySelectorAll<HTMLInputElement>('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder!;
    if (key in map) el.placeholder = map[key];
  });
  document.documentElement.lang = lang;
  localStorage.setItem('dk-lang', lang);

  // Sync toggle button state
  document.querySelectorAll<HTMLElement>('[data-lang]').forEach(el => {
    el.classList.toggle('nav__lang--active', el.dataset.lang === lang);
  });

  const btn = document.getElementById('lang-toggle');
  if (btn) btn.setAttribute('aria-label', lang === 'pl' ? 'Switch to English' : 'Przełącz na polski');
}

// Apply saved language on load
applyLang(getLang());

// Wire up the toggle button
document.getElementById('lang-toggle')?.addEventListener('click', () => {
  applyLang(getLang() === 'pl' ? 'en' : 'pl');
});
