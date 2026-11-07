import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export function normalize(items) {
  return items.filter(x => x && typeof x.title === 'string').map(x => ({
    title: x.title, store: x.source || 'Seller not listed',
    price: typeof x.extracted_price === 'number' && Number.isFinite(x.extracted_price) && x.extracted_price >= 0 && /^\$[\d,]+(?:\.\d+)?$/.test(x.price || '') ? x.extracted_price : null,
    priceLabel: x.price || 'Check listing for price',
    url: safeUrl(x.link) || safeUrl(x.product_link),
  }));
}
function safeUrl(value) {
  try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href : ''; } catch { return ''; }
}
export function createApp({ apiKey = process.env.SERPAPI_KEY, fetcher = fetch } = {}) {
  const cache = new Map();
  let calls = 0, busy = false;
  return http.createServer(async (req, res) => {
    const json = (code, data) => { res.writeHead(code, {'Content-Type':'application/json', 'Cache-Control':'no-store'}); res.end(JSON.stringify(data)); };
    try {
      const url = new URL(req.url, 'http://localhost');
      if (req.method !== 'GET') return json(405, {error:'Method not allowed.'});
      if (url.pathname === '/' || url.pathname === '/index.html') {
        res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'});
        return res.end(await readFile(new URL('./index.html', import.meta.url)));
      }
      if (url.pathname !== '/api/search') return json(404, {error:'Not found.'});
      // Reject cross-site requests; this starter is only for local use.
      if (req.headers['sec-fetch-site'] === 'cross-site') return json(403, {error:'Open SortSearch directly to search.'});
      const q = (url.searchParams.get('q') || '').trim();
      if (q.length < 2 || q.length > 160) return json(400, {error:'Enter between 2 and 160 characters.'});
      if (!apiKey || apiKey === 'PASTE_YOUR_KEY_HERE') return json(503, {error:'Add your SerpApi key to .env, then restart the server.'});
      const key = q.toLowerCase();
      const saved = cache.get(key);
      if (saved && Date.now() - saved.time < 15 * 60 * 1000) return json(200, saved.data);
      if (busy) return json(429, {error:'Another search is running. Please try again shortly.'});
      if (calls >= 20) return json(429, {error:'Local safety limit reached: 20 API requests this session. Check your SerpApi usage before restarting.'});
      busy = true;
      calls++;
      try {
        const endpoint = new URL('https://serpapi.com/search.json');
        endpoint.search = new URLSearchParams({engine:'google_shopping', q, gl:'us', hl:'en', api_key:apiKey});
        const response = await fetcher(endpoint, {signal:AbortSignal.timeout(30000)});
        if (!response.ok) return json(502, {error: response.status === 401 ? 'Your SerpApi key was rejected. Check .env and restart.' : 'Shopping search is unavailable. Check your SerpApi quota and try again.'});
        const data = await response.json();
        const empty = /hasn.t returned any results/i.test(data.error || '');
        if (data.error && !empty) return json(502, {error:'The search provider could not complete this search. Check your SerpApi dashboard.'});
        const payload = {offers:normalize(Array.isArray(data.shopping_results) ? data.shopping_results : []), retrievedAt:new Date().toISOString()};
        cache.set(key, {time:Date.now(), data:payload});
        return json(200, payload);
      } finally { busy = false; }
    } catch { return json(502, {error:'Search could not connect or took too long. Please try again.'}); }
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createApp().listen(3000, '127.0.0.1', () => console.log('Open http://localhost:3000 — press Control+C to stop.'));
}
