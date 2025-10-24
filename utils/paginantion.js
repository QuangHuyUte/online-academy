export function makePagination(page, total, limit) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const current = Math.min(Math.max(1, Number(page) || 1), totalPages);

  const pages = [];
  const window = 2;
  const start = Math.max(1, current - window);
  const end = Math.min(totalPages, current + window);
  for (let i = start; i <= end; i++) pages.push({ num: i, active: i === current });

  return {
    totalPages,
    hasPrev: current > 1,
    hasNext: current < totalPages,
    prevPage: Math.max(1, current - 1),
    nextPage: Math.min(totalPages, current + 1),
    pages
  };
}
