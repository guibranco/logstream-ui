import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from '@/src/components/Footer';
import { formatVersion } from '@/src/lib/version';

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
