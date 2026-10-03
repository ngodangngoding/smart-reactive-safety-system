const SORTABLE_DEFAULT = "createdAt";

export function parsePagination(searchParams, allowedSort = [SORTABLE_DEFAULT]) {
  const page = Math.max(1, Math.floor(Number(searchParams.get("page"))) || 1);
  const pageSize = Math.min(100, Math.max(1, Math.floor(Number(searchParams.get("pageSize"))) || 20));
  const sortBy = allowedSort.includes(searchParams.get("sortBy")) ? searchParams.get("sortBy") : SORTABLE_DEFAULT;
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize, orderBy: { [sortBy]: sortOrder } };
}

export function paginated(items, total, { page, pageSize }) {
  return { items, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
}
