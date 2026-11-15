/**
 * Derives an app key suggestion from an application's display name.
 *
 * The result always satisfies the server's app key rule
 * (`^[a-z0-9][a-z0-9-]*$`) or is an empty string when the name has
 * nothing usable in it:
 *  - accents are stripped ("Integração" → "integracao")
 *  - every run of other characters becomes a single hyphen
 *  - leading/trailing hyphens are trimmed
 *  - the result is capped at `maxLength` without ending on a hyphen
 */
export function suggestAppKey(name: string, maxLength = 64): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/, '');
}
