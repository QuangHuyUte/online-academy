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
  add: (a, b) => (Number(a) || 0) + (Number(b) || 0), // <— thêm để dùng STT theo trang
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
    formatCurrency: (n, currency = 'VND', locale = 'vi-VN', opts) => {
    // Handlebars luôn truyền đối tượng options ở THAM SỐ CUỐI
    // Trường hợp gọi: {{formatCurrency price}}  -> currency thực chất là options
    if (currency && typeof currency === 'object') {
      opts = currency;           // dịch options sang opts
      currency = 'USD';          // mặc định
      locale = 'en-US';
    } else if (locale && typeof locale === 'object') {
      // Trường hợp: {{formatCurrency price 'USD'}}
      opts = locale;
      locale = 'en-US';          // hợp lý với USD
    }

    // Hỗ trợ gọi kiểu đặt tên: {{formatCurrency price currency='USD' locale='en-US'}}
    const hash = opts?.hash || {};
    const cur = String(hash.currency || currency || 'USD');
    const loc = String(hash.locale   || locale   || 'en-US');

    const num = Number(n);
    if (!Number.isFinite(num)) return '';

    try {
      return new Intl.NumberFormat(loc, {
        style: 'currency',
        currency: cur,
        // Cho phép override các option khác nếu muốn
        ...hash
      }).format(num);
    } catch {
      // fallback an toàn nếu currency code sai
      return num.toLocaleString(loc);
    }
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

    dateVN: (d) => {
    if (!d) return '';
    const dt = (d instanceof Date) ? d : new Date(d);
    if (isNaN(dt.getTime())) return '';
    const pad = n => String(n).padStart(2,'0');
    const dd = pad(dt.getDate());
    const mm = pad(dt.getMonth()+1);
    const yyyy = dt.getFullYear();
    const hh = pad(dt.getHours());
    const mi = pad(dt.getMinutes());
    return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
  },
  lower: (s='') => String(s).toLowerCase(),
    // --- string containment ---
  contains: (container, value) => {
    if (container == null) return false;
    const s = String(container);
    return s.includes(String(value));
  },
  iContains: (container, value) => {
    if (container == null) return false;
    return String(container).toLowerCase().includes(String(value).toLowerCase());
  },
  startsWith: (str, prefix) => typeof str === 'string' && str.startsWith(String(prefix)),
  endsWith: (str, suffix) => typeof str === 'string' && str.endsWith(String(suffix)),

  // form helpers
  isSelected: (a, b) => (String(a) === String(b) ? 'selected' : ''),
  isChecked: (v) => (v ? 'checked' : ''),

  // string utils for HBS composing URLs
  concat: (...args) => args.slice(0, -1).join(''),               // <— thêm
  encodeURIComponent: (s='') => encodeURIComponent(String(s)),   // <— thêm
  
  // pagination
  /*buildPagination: (page = 1, totalPages = 1, baseUrl = '?') => {
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
  },*/

  // pagination (fixed version)

  buildPagination(page = 1, totalPages = 1, baseUrl = '?') {
    const safeUrl = ensureSlash(baseUrl);
    const current = Math.max(1, Number(page) || 1);
    const total   = Math.max(1, Number(totalPages) || 1);

    const join = (u, p) => {
      const sep = u.includes('?') ? '&' : '?';
      return `${u}${sep}page=${p}`;
    };

    const pages = [];
    const start = Math.max(1, current - 2);
    const end   = Math.min(total, current + 2);

    for (let i = start; i <= end; i++)
      pages.push({ page: i, url: join(safeUrl, i), active: i === current });

    return {
      hasPrev: current > 1,
      hasNext: current < total,
      prevUrl: join(safeUrl, current - 1),
      nextUrl: join(safeUrl, current + 1),
      pages,
    };
  },

};
  
export function isYouTube(url = '') {
  return /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/i.test(url);
}

export function toYouTubeEmbed(url = '') {
  // bắt id từ cả dạng watch?v=... và youtu.be/...
  const m1 = url.match(/[?&]v=([^&#]+)/);
  const m2 = url.match(/youtu\.be\/([^?&#]+)/);
  const id = (m1 && m1[1]) || (m2 && m2[1]) || '';
  return id ? `https://www.youtube.com/embed/${id}` : '';
}

const ensureSlash = (url) => url.startsWith('/') ? url : '/' + url;