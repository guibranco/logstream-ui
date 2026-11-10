/** Filters that can hold one value or a list (any of them matches). */
export const MULTI_VALUE_KEYS = ['app_key', 'level'] as const;
export type MultiValueKey = (typeof MULTI_VALUE_KEYS)[number];

/** The values of a one-or-many filter as a list (empty when unset). */
export function asList<T extends string>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null || value === '') return [];
  return Array.isArray(value) ? value.filter(v => v !== '') : [value];
}

/** Store a list back as the filter: unset when empty, a plain value when single. */
export function fromList<T extends string>(values: T[]): T | T[] | undefined {
  const unique = [...new Set(values.filter(v => v !== ''))];
  if (unique.length === 0) return undefined;
  return unique.length === 1 ? unique[0] : unique;
}

/** Add the value when absent, remove it when present. */
export function toggleValue<T extends string>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter(v => v !== value) : [...values, value];
}
