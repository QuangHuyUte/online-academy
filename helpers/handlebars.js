// helpers/handlebars.js
export function eq(a, b) {
  return a === b;
}

export function ne(a, b) {
  return a !== b;
}

export function lt(a, b) {
  return Number(a) < Number(b);
}

export function gt(a, b) {
  return Number(a) > Number(b);
}

export function and(a, b) {
  return a && b;
}

export function or(a, b) {
  return a || b;
}

export function json(ctx) {
  return JSON.stringify(ctx);
}

export function formatNumber(n) {
  const x = Number(n || 0);
  return x.toLocaleString('en-US');
}

export function formatCurrency(n, currency = 'USD') {
  const x = Number(n || 0);
  return x.toLocaleString('en-US', { style: 'currency', currency });
}

/** build query string cho phân trang */
export function pageUrl(basePath, page, query = '') {
  const qs = new URLSearchParams(query || '');
  qs.set('page', String(page));
  return `${basePath}?${qs.toString()}`;
}

/** helper cho checked/selected trong form */
export function isSelected(a, b) {
  return String(a) === String(b) ? 'selected' : '';
}
export function isChecked(val, truthy = true) {
  return String(val) === String(truthy) ? 'checked' : '';
}
