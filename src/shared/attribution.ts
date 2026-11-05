/* Запоминает, откуда пришёл посетитель (UTM-метки, click id, реферер) и отдаёт это формам заявок. */
const KEY = 'st_attribution_v1';
const UTM = ['source', 'medium', 'campaign', 'content', 'term'] as const;
const CLICK = ['fbclid', 'gclid', 'ttclid', 'yclid'] as const;
type Touch = Record<string, string>;
type Stored = { first?: Touch; last?: Touch; referrer?: string; landing?: string };

const read = (): Stored => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
const write = (value: Stored) => { try { localStorage.setItem(KEY, JSON.stringify(value)); } catch { /* хранилище недоступно */ } };

export function captureAttribution() {
  try {
    const params = new URLSearchParams(window.location.search);
    const touch: Touch = {};
    for (const key of UTM) { const v = params.get(`utm_${key}`); if (v) touch[key] = v.slice(0, 120); }
    for (const key of CLICK) { const v = params.get(key); if (v) touch[key] = v.slice(0, 200); }
    const stored = read();
    let referrer = '';
    try { if (document.referrer && new URL(document.referrer).host !== window.location.host) referrer = document.referrer; } catch { /* ignore */ }
    if (Object.keys(touch).length) {
      write({ first: stored.first || touch, last: touch, referrer: referrer || stored.referrer, landing: stored.landing || window.location.pathname });
    } else if (!stored.first && !stored.landing) {
      write({ referrer, landing: window.location.pathname });
    } else if (referrer && !stored.referrer) {
      write({ ...stored, referrer });
    }
  } catch { /* атрибуция не должна ломать сайт */ }
}

export function getAttribution(): Stored { return read(); }
