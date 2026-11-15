/** LogStream UI documentation, published on GitHub Pages. */
export const UI_DOCS_URL = 'https://guilherme.stracini.com.br/logstream-ui/';

/** LogStream server documentation, published on GitHub Pages. */
export const SERVER_DOCS_URL = 'https://guilherme.stracini.com.br/logstream-server/';

/** The configured server's own API docs (GET /docs), or undefined without a server URL. */
export function serverApiDocsUrl(apiUrl: string | undefined): string | undefined {
  const base = apiUrl?.trim().replace(/\/+$/, '');
  return base ? `${base}/docs` : undefined;
}
