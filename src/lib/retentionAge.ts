/**
 * How old an entry must be before a retention policy deletes it.
 *
 * The server stores either `older_than_days` (cut at midnight N days ago) or,
 * with features.retention_hours, `older_than_hours` (a rolling now − N hours).
 * The presets follow Seq's relative time ranges (see RANGE_PRESETS in
 * dateRange.ts) from one hour up; minute windows are left out because policies
 * only run on the server's schedule (interval_hours).
 */

export type AgeUnit = 'hours' | 'days';

export interface RetentionAge {
  value: number;
  unit: AgeUnit;
}

export interface RetentionAgePreset extends RetentionAge {
  /** Same keys as the search range presets (`12h`, `7d`, …). */
  key: string;
  label: string;
}

const preset = (value: number, unit: AgeUnit): RetentionAgePreset => ({
  key: `${value}${unit === 'hours' ? 'h' : 'd'}`,
  label: formatAge({ value, unit }),
  value,
  unit,
});

export const RETENTION_AGE_PRESETS: readonly RetentionAgePreset[] = [
  preset(1, 'hours'),
  preset(4, 'hours'),
  preset(12, 'hours'),
  preset(1, 'days'),
  preset(3, 'days'),
  preset(7, 'days'),
  preset(30, 'days'),
  preset(60, 'days'),
  preset(90, 'days'),
  preset(365, 'days'),
];

/** Key of the "Custom…" choice in the preset list. */
export const CUSTOM_AGE_KEY = 'custom';

interface AgeFields {
  older_than_days?: number | null;
  older_than_hours?: number | null;
}

/** The policy's age, or null when it has none (deletes matches at any age). */
export function ageOf(policy: AgeFields): RetentionAge | null {
  if (policy.older_than_hours) return { value: policy.older_than_hours, unit: 'hours' };
  if (policy.older_than_days) return { value: policy.older_than_days, unit: 'days' };
  return null;
}

/** API fields for an age: exactly one of the two is set, the other cleared. */
export function ageFields(age: RetentionAge): { older_than_days?: number; older_than_hours?: number } {
  return age.unit === 'hours'
    ? { older_than_days: undefined, older_than_hours: age.value }
    : { older_than_days: age.value, older_than_hours: undefined };
}

export function formatAge(age: RetentionAge): string {
  const unit = age.unit === 'hours' ? 'hour' : 'day';
  return `${age.value} ${unit}${age.value === 1 ? '' : 's'}`;
}

export function presetFor(age: RetentionAge | null): RetentionAgePreset | undefined {
  if (!age) return undefined;
  return RETENTION_AGE_PRESETS.find((p) => p.unit === age.unit && p.value === age.value);
}

const HOUR = 3_600_000;

/** Entries timestamped before this instant are deleted. */
export function cutoffFor(age: RetentionAge, now: Date = new Date()): Date {
  if (age.unit === 'hours') return new Date(now.getTime() - age.value * HOUR);
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - age.value);
}

/** How far back the cutoff lies, in (fractional) days, for ordering policies. */
export function ageInDays(age: RetentionAge, now: Date = new Date()): number {
  return (now.getTime() - cutoffFor(age, now).getTime()) / (24 * HOUR);
}
