// helpers/hbs.js
export default {
  addOne: (i) => Number(i) + 1,

  ifeq: function (a, b, opts) {
    // dùng trong select option, status, v.v.
    return a == b ? opts.fn(this) : opts.inverse(this);
  },

  json: (data) => JSON.stringify(data),

  formatMoney: (val) => {
    if (val === null || val === undefined) return '';
    return Number(val).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  },

  // helper dựng dữ liệu phân trang cho partials/pagination.hbs
  buildPagination: function (ctx, opts) {
    // ctx = { page, totalPages }
    const page = Number(ctx.page || 1);
    const totalPages = Number(ctx.totalPages || 1);
    const window = 2; // số trang hiển thị 2 mỗi phía

    const pages = [];
    const start = Math.max(1, page - window);
    const end = Math.min(totalPages, page + window);

    for (let i = start; i <= end; i++) {
      pages.push({ num: i, active: i === page });
    }

    const data = {
      totalPages,
      hasPrev: page > 1,
      hasNext: page < totalPages,
      prevPage: Math.max(1, page - 1),
      nextPage: Math.min(totalPages, page + 1),
      pages
    };

    // cho phép dùng như block helper: {{#buildPagination this}} {{> pagination}} {{/buildPagination}}
    return opts ? opts.fn(data) : data;
  }
};
