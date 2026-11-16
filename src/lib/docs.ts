/** LogStream UI documentation: the repository README on GitHub (the UI has no docs site). */
export const UI_DOCS_URL = 'https://github.com/guibranco/logstream-ui#readme';

/** LogStream server documentation, published on GitHub Pages. */
export const SERVER_DOCS_URL = 'https://guilherme.stracini.com.br/logstream-server/';

/** The configured server's own API docs (GET /docs), or undefined without a server URL. */
export function serverApiDocsUrl(apiUrl: string | undefined): string | undefined {
  const base = apiUrl?.trim().replace(/\/+$/, '');
  return base ? `${base}/docs` : undefined;
}

/** How to sign and send UDP log packets (logstream-server README). */
export const SERVER_UDP_DOCS_URL = 'https://github.com/guibranco/logstream-server#udp-ingestion';
