export const PAGE_SIZE = 24 * 7;

export function parseDateParam(value: string | null): Date | undefined | null {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parsePageParam(value: string | null): number | null {
  if (!value) return 1;
  if (!/^\d+$/.test(value)) return null;
  const page = Number(value);
  return page < 1 ? null : page;
}
