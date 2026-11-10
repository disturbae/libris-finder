import { CONFIG } from './config.js';

export function formatPrice(p) {
  if (!p) return '';
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: p.currency }).format(p.amount); }
  catch { return `${p.amount} ${p.currency ?? ''}`.trim(); }
}

/** ISBN-13 berawalan 978 -> ISBN-10 (sama dengan kode produk Amazon). */
function isbn13to10(isbn13) {
  if (!/^978\d{10}$/.test(isbn13)) return null;
  const core = isbn13.slice(3, 12);
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(core[i]) * (10 - i);
  const check = (11 - (sum % 11)) % 11;
  return core + (check === 10 ? 'X' : String(check));
}

export function buildLinks(book) {
  const term = book.isbn ?? `${book.title} ${book.authors[0] ?? ''}`.trim();
  const q = encodeURIComponent(term);
  const id = encodeURIComponent(book.id);
  const links = [];

  // Google Play: tautan langsung ke halaman buku
  if (book.buyLink) {
    const price = formatPrice(book.price);
    links.push({
      kind: 'play',
      label: price ? `Google Play · ${price}` : 'Google Play',
      href: `https://play.google.com/store/books/details?id=${id}`
    });
  }

  // Amazon: tautan langsung jika ISBN-nya bisa diubah ke ISBN-10
  const { amazonDomain, amazonTag } = CONFIG.AFFILIATE;
  const asin = book.isbn?.length === 10 ? book.isbn : (book.isbn ? isbn13to10(book.isbn) : null);
  const amazonHref = asin
    ? `https://${amazonDomain}/dp/${asin}${amazonTag ? `?tag=${encodeURIComponent(amazonTag)}` : ''}`
    : `https://${amazonDomain}/s?k=${q}${amazonTag ? `&tag=${encodeURIComponent(amazonTag)}` : ''}`;
  links.push({ kind: 'amazon', label: 'Amazon', href: amazonHref, sponsored: !!amazonTag });

  // Toko lain (pencarian berdasarkan ISBN)
  for (const s of CONFIG.STORES) {
    links.push({ kind: 'store', label: s.label, href: s.url.replace('{q}', q) });
  }

  // Detail di Google Books
  links.push({ kind: 'info', label: 'Details', href: book.infoLink ?? `https://books.google.com/books?id=${id}` });
  return links;
}