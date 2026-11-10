export const CONFIG = {
  API_KEY: 'AIzaSyCEp8v3AFCEMoWVw3jHcibp6acxFxkrHRQ',                 // optional but recommended; restrict it by HTTP referrer
  MAX_RESULTS: 12,
  DEBOUNCE_MS: 450,
  CACHE_TTL_MS: 10 * 60 * 1000,
  MAX_RETRIES: 2,
  AFFILIATE: { amazonDomain: 'www.amazon.com', amazonTag: '' },   // e.g. 'yourtag-20'
  // {q} is replaced with the URL-encoded ISBN (or "title author" if there is no ISBN)
  STORES: [
    { label: 'Bookshop.org', url: 'https://bookshop.org/search?keywords={q}' },
    { label: 'Gramedia',     url: 'https://www.gramedia.com/search?q={q}' }
  ],
  FALLBACK_COVER: 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="1.5"><path d="M4 4h12a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V4z"/><path d="M8 8h7"/></svg>')
};