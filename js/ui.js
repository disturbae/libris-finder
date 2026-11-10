import { CONFIG } from './config.js';
import { buildLinks, formatPrice } from './links.js';

const $ = id => document.getElementById(id);
const els = { status: $('status'), results: $('results'), more: $('more'), tpl: $('card-tpl') };

export function setStatus(text, { error = false } = {}) {
  els.status.className = 'status' + (error ? ' status--error' : '');
  els.status.textContent = text;
}

export function showEmpty(query, onSuggest) {
  setStatus(`No books found for “${query}”. Check the spelling, use fewer words, or try an ISBN.`);
  const wrap = document.createElement('div');
  wrap.className = 'status__chips';
  ['Atomic Habits', 'Laskar Pelangi', 'isbn:9780143127741'].forEach(s => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.textContent = s;
    b.addEventListener('click', () => onSuggest(s));
    wrap.append(b);
  });
  els.status.append(wrap);
}

export function showSkeletons(n = 6) {
  els.results.replaceChildren(...Array.from({ length: n }, () => {
    const d = document.createElement('div'); d.className = 'card card--skeleton'; return d;
  }));
}

export function clearResults() { els.results.replaceChildren(); }
export function toggleMore(visible, busy = false) {
  els.more.hidden = !visible; els.more.disabled = busy;
  els.more.textContent = busy ? 'Loading…' : 'Load more';
}

export function renderBooks(books, { append = false } = {}) {
  const frag = document.createDocumentFragment();
  for (const b of books) frag.append(card(b));
  append ? els.results.append(frag) : els.results.replaceChildren(frag);
}

function card(b) {
  const node = els.tpl.content.firstElementChild.cloneNode(true);
  const img = node.querySelector('.card__img');
  img.alt = b.thumb ? `Cover of ${b.title}` : '';
  img.src = b.thumb || CONFIG.FALLBACK_COVER;
  if (!b.thumb) img.classList.add('card__img--fallback');
  img.addEventListener('error', () => { img.src = CONFIG.FALLBACK_COVER; img.classList.add('card__img--fallback'); }, { once: true });

  node.querySelector('.card__title').textContent = b.title;
  node.querySelector('.card__title').title = b.title;
  node.querySelector('.card__author').textContent = b.authors.join(', ') || 'Unknown author';
  node.querySelector('.card__meta').textContent = [b.year, b.isbn && `ISBN ${b.isbn}`].filter(Boolean).join(' · ');
  const price = node.querySelector('.card__price');
  if (b.price) { price.textContent = formatPrice(b.price); price.hidden = false; }

  const list = node.querySelector('.card__links');
  for (const l of buildLinks(b)) {
    const li = document.createElement('li'), a = document.createElement('a');
    a.className = `card__link card__link--${l.kind}`;
    a.href = l.href; a.target = '_blank';
    a.rel = 'noopener noreferrer' + (l.sponsored ? ' sponsored' : '');
    a.textContent = l.label;
    li.append(a); list.append(li);
  }
  return node;
}