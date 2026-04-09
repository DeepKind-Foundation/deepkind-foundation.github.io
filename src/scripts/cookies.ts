const STORAGE_KEY = 'dk-cookies';

function getBanner(): HTMLElement | null {
  return document.getElementById('cookie-banner');
}

function dismiss(): void {
  const banner = getBanner();
  if (banner) banner.setAttribute('hidden', '');
}

function setConsent(value: 'all' | 'necessary'): void {
  localStorage.setItem(STORAGE_KEY, value);
  dismiss();
}

/** Resolve a dot-path like "cookieBanner.acceptAll" against a plain object. */
function resolvePath(obj: unknown, path: string): string | undefined {
  const val = path.split('.').reduce<unknown>((node, key) => {
    if (typeof node === 'object' && node !== null) {
      return (node as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
  return typeof val === 'string' ? val : undefined;
}

/**
 * Apply the currently saved language to the banner before revealing it.
 * Runs independently of i18n.ts so the banner never flashes in the wrong language.
 */
function applyLangToBanner(banner: HTMLElement): void {
  const lang = localStorage.getItem('dk-lang') ?? 'pl';
  if (lang !== 'en') return;
  const enEl = document.getElementById('i18n-en');
  if (!enEl) return;
  try {
    const data: unknown = JSON.parse(enEl.textContent ?? '{}');
    banner.querySelectorAll<HTMLElement>('[data-i18n]').forEach(el => {
      const val = resolvePath(data, el.dataset.i18n!);
      if (val !== undefined) el.textContent = val;
    });
  } catch { /* malformed JSON — leave PL text */ }
}

function init(): void {
  if (localStorage.getItem(STORAGE_KEY)) return;
  const banner = getBanner();
  if (!banner) return;
  applyLangToBanner(banner);
  banner.removeAttribute('hidden');
}

document
  .getElementById('cookie-accept-all')
  ?.addEventListener('click', () => setConsent('all'));

document
  .getElementById('cookie-necessary')
  ?.addEventListener('click', () => setConsent('necessary'));

init();
