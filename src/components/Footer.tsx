import React from 'react';
import { formatVersion } from '../lib/version';
import { UI_DOCS_URL, serverApiDocsUrl } from '../lib/docs';

interface FooterProps {
  uiVersion: string;
  /** Undefined while /api/info is loading or unreachable. */
  serverVersion?: string;
  /** The configured server's base URL; its /docs page is linked from the server version. */
  apiUrl?: string;
}

const versionLinkClass = 'hover:text-primary-400 hover:underline transition-colors';

export const Footer: React.FC<FooterProps> = ({ uiVersion, serverVersion, apiUrl }) => {
  const serverDocs = serverApiDocsUrl(apiUrl);
  const serverLabel = `Server ${formatVersion(serverVersion)}`;

  return (
  <footer className="shrink-0 border-t border-gray-800 bg-gray-950 px-3 md:px-4 py-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] text-gray-500">
    <div className="flex items-center gap-3 font-mono">
      <a
        data-testid="ui-version"
        href={UI_DOCS_URL}
        target="_blank"
        rel="noopener noreferrer"
        title="LogStream UI documentation"
        className={versionLinkClass}
      >
        UI {formatVersion(uiVersion)}
      </a>
      <span className="text-gray-700" aria-hidden="true">·</span>
      {serverDocs ? (
        <a
          data-testid="server-version"
          href={serverDocs}
          target="_blank"
          rel="noopener noreferrer"
          title="LogStream server API documentation"
          className={versionLinkClass}
        >
          {serverLabel}
        </a>
      ) : (
        <span data-testid="server-version">{serverLabel}</span>
      )}
    </div>
    <div>
      Built with{' '}
      <span className="text-primary-500" role="img" aria-label="love">♥</span>
      {' '}by{' '}
      <a
        href="https://github.com/guibranco"
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-400 hover:text-primary-400 transition-colors"
      >
        GuiBranco
      </a>
    </div>
  </footer>
  );
};
