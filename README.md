# LibrisFinder – Technical Implementation Guide

## 1. Architecture Overview
```
libris-finder/
├── index.html        semantic shell + <template> for result cards
├── css/styles.css    BEM components, custom properties, grid, dark mode
└── js/
    ├── config.js     API key, affiliate tag, store URL templates
    ├── api.js        fetch, cache, retry/backoff, normalize()
    ├── links.js      purchase-URL mapping + price formatting
    ├── ui.js         DOM rendering, states (loading/empty/error)
    └── main.js       events, debounce, abort, pagination
```
Data flow: `input → debounce → searchBooks() (cache → fetch → retry) → normalize() → renderBooks() → buildLinks()`.
A new search aborts the previous request (AbortController), so slow responses never overwrite newer ones.

## 2. Google Books API integration
- Endpoint: `GET https://www.googleapis.com/books/v1/volumes?q=<query>&startIndex=0&maxResults=12&printType=books&key=<KEY>`
- Query operators: `intitle:`, `inauthor:`, `isbn:`.
- `fields=` trims the payload to what the UI uses.
- Every field can be missing, so `normalize()` supplies defaults:

| Gap in API data | Handling |
|---|---|
| No `imageLinks` / broken image | inline SVG fallback cover (also on `<img> error`) |
| `http:` thumbnails | upgraded to `https:` |
| No `authors` | "Unknown author" |
| No price / not `FOR_SALE` | price hidden, Play button omitted |
| No `items` (zero results) | `[]` → friendly empty state with suggestion chips |
| 429 / 5xx | exponential backoff (2 retries), then a clear error message |
| Offline | distinct "offline" message |
| Long titles | `overflow-wrap:anywhere` + 3-line clamp, full title in `title` attr |

Rate-limit strategy: 450 ms debounce, 3+ character minimum for live search, 10-minute in-memory cache, request abort, and your own API key (anonymous quota is shared and small).

## 3. Mapping purchase URLs (`links.js`)
| Destination | URL pattern |
|---|---|
| Google Play | `saleInfo.buyLink` (only when `saleability === "FOR_SALE"`) |
| Amazon | `https://www.amazon.com/s?k=<ISBN or "title author">&tag=<your-tag>` |
| Bookshop.org | `https://bookshop.org/search?keywords=<ISBN>` |
| Gramedia (local example) | `https://www.gramedia.com/search?q=<ISBN>` |

ISBN-13 is preferred, then ISBN-10, then "title + first author". Add any store by appending `{label, url}` with a `{q}` placeholder to `CONFIG.STORES`. Affiliate links get `rel="sponsored noopener noreferrer"`; disclose affiliate use on your site (and per Amazon Associates terms).

## 4. UI/UX design system for result cards
- Tokens: `--c-brand #1f3a5f`, `--c-accent #e07a1f`, `--radius 14px`; automatic dark mode.
- Layout: 1 column (<640px), 2 columns (≥640px), 3 columns (≥960px). Card = 96×144 cover + text column (`min-width:0` prevents overflow).
- Button color coding: green = Google Play, dark = Amazon, purple = local store, outline = details. Touch targets ≥36px.
- States: skeleton loaders, `aria-live` status line, error text in red, `prefers-reduced-motion` respected.
- BEM blocks: `.hero`, `.search`, `.status`, `.grid`, `.card` (`__media __img __body __title __author __meta __price __links __link--play|amazon|store|info`), `.more`, `.chip`.

## 5. Implementation roadmap
1. **API key**: Google Cloud Console → new project → enable *Books API* → Credentials → *Create API key* → restrict by *HTTP referrers* (your domain + `localhost`) and to the Books API. Paste into `CONFIG.API_KEY`.
2. **Affiliate**: join Amazon Associates for your region, set `amazonTag` and `amazonDomain` (e.g. `www.amazon.co.uk`).
3. **Run locally**: ES modules need a server, not `file://`: `npx serve .` or `python3 -m http.server 8080`.
4. **Test**: ISBN `isbn:9780143127741`, an obscure title (empty state), a very long title, DevTools → Offline (error state), throttle to Slow 3G.
5. **Deploy** (static hosting, no build step): GitHub Pages, Netlify, Cloudflare Pages or Vercel. Upload the folder, add your domain to the key's referrer list, and enable HTTPS.
6. **Later upgrades**: service worker for offline shell, `localStorage` recent searches, and `?q=` URL sync for shareable searches.