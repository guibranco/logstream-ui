import React from 'react';
import { formatVersion } from '../lib/version';

interface FooterProps {
  uiVersion: string;
  /** Undefined while /api/info is loading or unreachable. */
  serverVersion?: string;
}

export const Footer: React.FC<FooterProps> = ({ uiVersion, serverVersion }) => (
  <footer className="shrink-0 border-t border-gray-800 bg-gray-950 px-3 md:px-4 py-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] text-gray-500">
    <div className="flex items-center gap-3 font-mono">
      <span data-testid="ui-version">UI {formatVersion(uiVersion)}</span>
      <span className="text-gray-700" aria-hidden="true">·</span>
      <span data-testid="server-version">Server {formatVersion(serverVersion)}</span>
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
