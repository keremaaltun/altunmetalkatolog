/* Ürün Kataloğu Betiği */

const state = { products: [], filtered: [], categories: new Set(), activeImages: [], activeImageIndex: 0 };

function formatCurrency(value, currency = 'TRY', locale = 'tr-TR') {
  try { return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value); }
  catch { return `${value.toFixed(2)} ${currency}`; }
}

async function loadData() {
  const res = await fetch('data/products.json');
  const products = await res.json();
  state.products = products;
  state.filtered = products.slice();
  state.categories = new Set(products.flatMap(p => p.category ? [p.category] : []));
}

function applyConfig() {
  const cfg = window.CATALOG_CONFIG || {};
  if (cfg.companyName) { document.getElementById('companyName').textContent = cfg.companyName; document.getElementById('companyNameFooter').textContent = cfg.companyName; }
  if (cfg.companyTagline) { document.getElementById('companyTagline').textContent = cfg.companyTagline; }
  if (cfg.companyContact) { document.getElementById('companyContact').textContent = cfg.companyContact; }
  document.getElementById('year').textContent = new Date().getFullYear();
}

function renderCategories() {
  const select = document.getElementById('categorySelect');
  for (const category of Array.from(state.categories).sort()) {
    const opt = document.createElement('option');
    opt.value = category; opt.textContent = category; select.appendChild(opt);
  }
}

function productCard(product) {
  const price = product.price != null ? formatCurrency(product.price, product.currency || 'TRY') : '';
  const image = (product.images && product.images[0]) || 'assets/placeholder.svg';
  const isNew = product.isNew ? '<span class="badge badge--new">Yeni</span>' : '';
  const code = product.code ? `<span class="pill">Kod: ${product.code}</span>` : '';
  const category = product.category ? `<span class="pill">${product.category}</span>` : '';
  return `
    <article class="card" data-id="${product.id}">
      <div class="card__media" data-images='${JSON.stringify(product.images || [])}'>
        <img src="${image}" alt="${product.name}" loading="lazy" />
        <div class="card__badges">${isNew}</div>
      </div>
      <div class="card__body">
        <h3 class="card__title">${product.name}</h3>
        <p class="card__subtitle">${product.description || ''}</p>
        <div class="card__meta">${code} ${category}</div>
      </div>
      <div class="card__footer">
        <div class="card__price">${price}</div>
        <div class="card__actions">
          <button class="btn btn-secondary btn-view" type="button">Görüntüle</button>
        </div>
      </div>
    </article>
  `;
}

function renderGrid() {
  const grid = document.getElementById('productGrid');
  if (state.filtered.length === 0) { grid.innerHTML = ''; document.getElementById('emptyState').hidden = false; }
  else { document.getElementById('emptyState').hidden = true; grid.innerHTML = state.filtered.map(productCard).join(''); }
  document.getElementById('resultsMeta').textContent = `${state.filtered.length} sonuç`;
}

function attachGridEvents() {
  const grid = document.getElementById('productGrid');
  grid.addEventListener('click', (e) => {
    const card = e.target.closest('.card'); if (!card) return;
    if (e.target.closest('.card__media') || e.target.closest('.btn-view')) {
      const images = JSON.parse(card.querySelector('.card__media').dataset.images || '[]');
      openLightbox(images);
    }
  });
}

function filterAndSort() {
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  const category = document.getElementById('categorySelect').value;
  const sort = document.getElementById('sortSelect').value;

  state.filtered = state.products.filter(p => {
    const inCategory = !category || p.category === category;
    if (!q) return inCategory;
    const hay = `${p.name} ${p.description || ''} ${p.code || ''} ${(p.tags || []).join(' ')}`.toLowerCase();
    return inCategory && hay.includes(q);
  });

  const [key, dir] = sort.split('-');
  const mul = dir === 'desc' ? -1 : 1;
  state.filtered.sort((a, b) => {
    switch (key) {
      case 'name': return mul * (a.name || '').localeCompare(b.name || '');
      case 'price': return mul * ((a.price ?? Infinity) - (b.price ?? Infinity));
      case 'code': return mul * (a.code || '').localeCompare(b.code || '');
      default: return 0;
    }
  });
}

function attachToolbarEvents() {
  document.getElementById('searchInput').addEventListener('input', () => { filterAndSort(); renderGrid(); });
  document.getElementById('categorySelect').addEventListener('change', () => { filterAndSort(); renderGrid(); });
  document.getElementById('sortSelect').addEventListener('change', () => { filterAndSort(); renderGrid(); });
  document.getElementById('resetFiltersBtn').addEventListener('click', () => {
    document.getElementById('searchInput').value = '';
    document.getElementById('categorySelect').value = '';
    document.getElementById('sortSelect').value = 'name-asc';
    filterAndSort(); renderGrid();
  });
  document.getElementById('printBtn').addEventListener('click', () => window.print());
}

// Lightbox
function openLightbox(images) {
  if (!images || images.length === 0) return;
  state.activeImages = images; state.activeImageIndex = 0;
  updateLightbox();
  const lb = document.getElementById('lightbox'); lb.classList.add('open'); lb.setAttribute('aria-hidden', 'false');
}
function updateLightbox() {
  const img = document.getElementById('lightboxImage'); const counter = document.getElementById('lightboxCounter');
  img.src = state.activeImages[state.activeImageIndex]; counter.textContent = `${state.activeImageIndex + 1} / ${state.activeImages.length}`;
}
function closeLightbox() { const lb = document.getElementById('lightbox'); lb.classList.remove('open'); lb.setAttribute('aria-hidden', 'true'); }
function attachLightboxEvents() {
  const lb = document.getElementById('lightbox');
  lb.addEventListener('click', (e) => { if (e.target === lb) closeLightbox(); });
  lb.querySelector('.lightbox__close').addEventListener('click', closeLightbox);
  lb.querySelector('.lightbox__prev').addEventListener('click', () => { if (state.activeImageIndex > 0) { state.activeImageIndex--; updateLightbox(); } });
  lb.querySelector('.lightbox__next').addEventListener('click', () => { if (state.activeImageIndex < state.activeImages.length - 1) { state.activeImageIndex++; updateLightbox(); } });
  document.addEventListener('keydown', (e) => {
    if (lb.classList.contains('open')) {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft' && state.activeImageIndex > 0) { state.activeImageIndex--; updateLightbox(); }
      if (e.key === 'ArrowRight' && state.activeImageIndex < state.activeImages.length - 1) { state.activeImageIndex++; updateLightbox(); }
    }
  });
}

async function init() {
  applyConfig();
  await loadData();
  renderCategories();
  filterAndSort();
  renderGrid();
  attachToolbarEvents();
  attachGridEvents();
  attachLightboxEvents();
}

window.addEventListener('DOMContentLoaded', init);

