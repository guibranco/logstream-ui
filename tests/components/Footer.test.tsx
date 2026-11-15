import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from '@/src/components/Footer';
import { formatVersion } from '@/src/lib/version';
import { UI_DOCS_URL, serverApiDocsUrl } from '@/src/lib/docs';

describe('Footer', () => {
  it('shows the UI and server versions', () => {
    render(<Footer uiVersion="1.4.0" serverVersion="2.3.1" />);
    expect(screen.getByTestId('ui-version')).toHaveTextContent('UI v1.4.0');
    expect(screen.getByTestId('server-version')).toHaveTextContent('Server v2.3.1');
  });

  it('shows a dash while the server version is unknown', () => {
    render(<Footer uiVersion="dev" />);
    expect(screen.getByTestId('ui-version')).toHaveTextContent('UI dev');
    expect(screen.getByTestId('server-version')).toHaveTextContent('Server —');
  });

  it('links the UI version to the UI docs on GitHub Pages', () => {
    render(<Footer uiVersion="1.4.0" />);
    const link = screen.getByTestId('ui-version');
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', UI_DOCS_URL);
    expect(link).toHaveAttribute('target', '_blank');
  });

  it("links the server version to the configured server's /docs", () => {
    render(<Footer uiVersion="1.4.0" serverVersion="2.3.1" apiUrl="https://logs.example.com/" />);
    const link = screen.getByTestId('server-version');
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', 'https://logs.example.com/docs');
  });

  it('shows the server version as plain text when no server is configured', () => {
    render(<Footer uiVersion="1.4.0" serverVersion="2.3.1" />);
    expect(screen.getByTestId('server-version').tagName).toBe('SPAN');
  });

  it('credits GuiBranco with a link to GitHub', () => {
    render(<Footer uiVersion="dev" />);
    const link = screen.getByRole('link', { name: 'GuiBranco' });
    expect(link).toHaveAttribute('href', 'https://github.com/guibranco');
    expect(screen.getByRole('img', { name: 'love' })).toHaveClass('text-primary-500');
  });
});

describe('formatVersion', () => {
  it('prefixes numeric versions with v and leaves labels alone', () => {
    expect(formatVersion('1.2.3-beta.4')).toBe('v1.2.3-beta.4');
    expect(formatVersion('dev')).toBe('dev');
    expect(formatVersion(undefined)).toBe('—');
  });
});

describe('serverApiDocsUrl', () => {
  it("builds the server's /docs URL and drops trailing slashes", () => {
    expect(serverApiDocsUrl('https://logs.example.com')).toBe('https://logs.example.com/docs');
    expect(serverApiDocsUrl(' https://logs.example.com// ')).toBe('https://logs.example.com/docs');
    expect(serverApiDocsUrl('')).toBeUndefined();
    expect(serverApiDocsUrl(undefined)).toBeUndefined();
  });
});
