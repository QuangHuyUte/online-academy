export default {
  // logic
  eq: (a, b) => a === b,
  ne: (a, b) => a !== b,
  gt: (a, b) => a > b,
  gte: (a, b) => a >= b,
  lt: (a, b) => a < b,
  lte: (a, b) => a <= b,
  and() { return [...arguments].slice(0, -1).every(Boolean); },
  or()  { return [...arguments].slice(0, -1).some(Boolean); },
  not: (v) => !v,

  // numbers & text
  inc: (v) => Number(v) + 1,
  add: (a, b) => Number(a) + Number(b), // <— thêm để dùng STT theo trang
  truncate: (str, len = 120) => (str?.length > len ? str.slice(0, len) + '…' : (str || '')),
  stripHtml: (html = '') => String(html).replace(/<[^>]+>/gms, ''),

  // json/debug
  json: (obj) => { try { return JSON.stringify(obj ?? {}, null, 2); } catch { return '{}'; } },

  // collections
  empty: (v) => {
    if (!v) return true;
    if (Array.isArray(v)) return v.length === 0;
    if (typeof v === 'object') return Object.keys(v).length === 0;
    return !v;
  },
  times: function (n, block) {
    let out = '';
    for (let i = 0; i < Number(n || 0); i++) out += block.fn(i);
    return out;
  },

  // formatting
  formatCurrency: (n, currency = 'VND', locale = 'vi-VN') => {
    const num = (typeof n === 'number' ? n : Number(n || 0));
    return Number.isFinite(num)
      ? num.toLocaleString(locale, { style: 'currency', currency })
      : '';
  },
  formatDate: (d, locale = 'vi-VN', tz = 'Asia/Ho_Chi_Minh') => {
    if (!d) return '';
    const date = (d instanceof Date) ? d : new Date(d);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleString(locale, {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  },

  // form helpers
  isSelected: (a, b) => (String(a) === String(b) ? 'selected' : ''),
  isChecked: (v) => (v ? 'checked' : ''),

  // string utils for HBS composing URLs
  concat: (...args) => args.slice(0, -1).join(''),               // <— thêm
  encodeURIComponent: (s='') => encodeURIComponent(String(s)),   // <— thêm

  // pagination
  buildPagination: (page = 1, totalPages = 1, baseUrl = '?') => {
    page = Math.max(1, Number(page) || 1);
    totalPages = Math.max(1, Number(totalPages) || 1);

    const makeUrl = (p) => {
      try {
        const url = new URL(baseUrl, 'http://x/');
        url.searchParams.set('page', p);
        return (url.origin === 'http://x/') ? url.pathname + url.search : url.toString();
      } catch {
        // Fallback: nếu baseUrl đã có query (không chứa page), nối &page=
        return baseUrl.includes('?') ? `${baseUrl}&page=${p}` : `${baseUrl}?page=${p}`;
      }
    };

    const windowSize = 2;
    const start = Math.max(1, page - windowSize);
    const end = Math.min(totalPages, page + windowSize);

    const pages = [];
    for (let i = start; i <= end; i++) pages.push({ page: i, active: i === page, url: makeUrl(i) });

    return {
      page, totalPages,
      hasPrev: page > 1,
      hasNext: page < totalPages,
      prevUrl: makeUrl(Math.max(1, page - 1)),
      nextUrl: makeUrl(Math.min(totalPages, page + 1)),
      pages
    };
  },
};
