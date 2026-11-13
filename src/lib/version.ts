/** UI version, stamped at build time by GitVersion (VITE_APP_VERSION); "dev" for local builds. */
export const UI_VERSION: string = import.meta.env.VITE_APP_VERSION || 'dev';

/** "1.2.3" → "v1.2.3"; labels such as "dev" are shown as they are. */
export function formatVersion(version: string | undefined): string {
  if (!version) return '—';
  return /^\d/.test(version) ? `v${version}` : version;
}
