import { CONFIG } from './config.js';
import { searchBooks, ApiError } from './api.js';
import * as ui from './ui.js';

const form = document.getElementById('search-form');
const input = document.getElementById('q');
const more = document.getElementById('more');

let query = '', start = 0, seen = new Set(), controller = null, timer = null;

async function run(q, { append = false } = {}) {
  controller?.abort();
  controller = new AbortController();
  if (!append) { query = q; start = 0; seen = new Set(); ui.showSkeletons(); ui.toggleMore(false); ui.setStatus('Searching…'); }
  else ui.toggleMore(true, true);

  try {
    const books = (await searchBooks(query, start, controller.signal)).filter(b => !seen.has(b.id));
    books.forEach(b => seen.add(b.id));

    if (!append && books.length === 0) { ui.clearResults(); ui.toggleMore(false); return ui.showEmpty(query, s => { input.value = s; run(s); }); }

    ui.renderBooks(books, { append });
    start += CONFIG.MAX_RESULTS;
    ui.setStatus(`Showing ${seen.size} result${seen.size === 1 ? '' : 's'} for “${query}”`);
    ui.toggleMore(books.length > 0 && start < 200);        // Google caps deep paging; stop at 200
  } catch (e) {
    if (e.name === 'AbortError') return;
    if (!append) ui.clearResults();
    ui.toggleMore(append);
    const msg = e instanceof ApiError && e.kind === 'rate' ? 'Too many requests right now. Please wait a moment and try again.'
              : e instanceof ApiError && e.kind === 'network' ? 'You appear to be offline. Check your connection and try again.'
              : 'Something went wrong while searching. Please try again.';
    ui.setStatus(msg, { error: true });
  }
}

form.addEventListener('submit', e => { e.preventDefault(); clearTimeout(timer); const q = input.value.trim(); if (q.length >= 2) run(q); });
input.addEventListener('input', () => {                      // live search, debounced
  clearTimeout(timer);
  const q = input.value.trim();
  if (q.length >= 3) timer = setTimeout(() => run(q), CONFIG.DEBOUNCE_MS);
});
more.addEventListener('click', () => run(query, { append: true }));