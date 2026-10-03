export const NOT_DELETED = { is_deleted: false };

export const softDeleteData = () => ({ is_deleted: true, deletedAt: new Date() });

export const scrambleUnique = (value) => `deleted_${Date.now()}_${value}`;

export function stripDeleted(record, relations) {
  if (!record) return record;
  const copy = { ...record };
  for (const name of relations) {
    if (copy[name]?.is_deleted) copy[name] = null;
  }
  return copy;
}
