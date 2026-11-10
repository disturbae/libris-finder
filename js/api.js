import { CONFIG } from './config.js';

const BASE = 'https://www.googleapis.com/books/v1/volumes';
const FIELDS = 'items(id,volumeInfo(title,authors,publishedDate,industryIdentifiers,imageLinks,infoLink,previewLink),' +
               'saleInfo(saleability,buyLink,listPrice,retailPrice))';
const cache = new Map();
const sleep = ms => new Promise(r => setTimeout(r, ms));

export class ApiError extends Error {
  constructor(kind, message) { super(message); this.kind = kind; }   // 'network' | 'rate' | 'http'
}

/** Defensive normalizer: every field may be missing in Google's payload. */
export function normalize(item) {
  const v = item.volumeInfo ?? {}, s = item.saleInfo ?? {};
  const ids = v.industryIdentifiers ?? [];
  const isbn = (ids.find(i => i.type === 'ISBN_13') ?? ids.find(i => i.type === 'ISBN_10'))?.identifier ?? null;
  const thumb = (v.imageLinks?.thumbnail ?? v.imageLinks?.smallThumbnail ?? '')
    .replace(/^http:/, 'https:').replace('&edge=curl', '');
  const p = s.saleability === 'FOR_SALE' ? (s.retailPrice ?? s.listPrice) : null;
  return {
    id: item.id,
    title: v.title?.trim() || 'Untitled',
    authors: v.authors ?? [],
    year: v.publishedDate?.slice(0, 4) ?? '',
    isbn, thumb,
    price: p?.amount != null ? { amount: p.amount, currency: p.currencyCode } : null,
    buyLink: s.buyLink ?? null,
    infoLink: v.infoLink ?? v.previewLink ?? null
  };
}

export async function searchBooks(query, startIndex = 0, signal) {
  const key = `${query}|${startIndex}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < CONFIG.CACHE_TTL_MS) return hit.books;

  const params = new URLSearchParams({
    q: query, startIndex, maxResults: CONFIG.MAX_RESULTS, printType: 'books', fields: FIELDS
  });
  if (CONFIG.API_KEY) params.set('key', CONFIG.API_KEY);

  for (let attempt = 0; ; attempt++) {
    let res;
    try { res = await fetch(`${BASE}?${params}`, { signal }); }
    catch (e) {
      if (e.name === 'AbortError') throw e;
      throw new ApiError('network', 'Network unavailable');
    }
    if (res.ok) {
      const data = await res.json();
      const books = (data.items ?? []).map(normalize);      // no items => empty array, never a crash
      cache.set(key, { t: Date.now(), books });
      return books;
    }
    const retryable = res.status === 429 || res.status >= 500;
    if (retryable && attempt < CONFIG.MAX_RETRIES) { await sleep(600 * 2 ** attempt); continue; }
    throw new ApiError(res.status === 429 ? 'rate' : 'http', `HTTP ${res.status}`);
  }
}