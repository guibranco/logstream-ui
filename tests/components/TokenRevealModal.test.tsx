import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TokenRevealModal } from '@/src/components/clients/TokenRevealModal';

describe('TokenRevealModal', () => {
  const mockProps = {
    appKey: 'test-app',
    token: 'xQ3mK9-test-token-44-character-base64',
    onClose: vi.fn(),
  };

  it('renders the app key and token correctly', () => {
    render(<TokenRevealModal {...mockProps} />);
    
    expect(screen.getAllByText('test-app').length).toBeGreaterThan(0);
    expect(screen.getByText(mockProps.token)).toBeInTheDocument();
  });

  it('handles token copying correctly', async () => {
    const mockClipboard = {
      writeText: vi.fn().mockImplementation(() => Promise.resolve()),
    };
    Object.assign(navigator, { clipboard: mockClipboard });

    render(<TokenRevealModal {...mockProps} />);
    
    const copyButton = screen.getByTitle('Copy to clipboard');
    fireEvent.click(copyButton);

    expect(mockClipboard.writeText).toHaveBeenCalledWith(mockProps.token);
    
    // The icon changes from Copy to Check
    expect(copyButton.querySelector('.lucide-check')).toBeInTheDocument();
  });

  it('calls onClose when the confirmation button is clicked', () => {
    render(<TokenRevealModal {...mockProps} />);
    
    const confirmButton = screen.getByText(/I've saved the token securely/i);
    fireEvent.click(confirmButton);

    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('displays implementation example headers', () => {
    render(<TokenRevealModal {...mockProps} />);
    
    expect(screen.getByText(/X-Api-Key:/i)).toBeInTheDocument();
    expect(screen.getByText(/X-Api-Token:/i)).toBeInTheDocument();
    expect(screen.getAllByText(mockProps.appKey).length).toBeGreaterThan(0);
  });
});

describe('TokenRevealModal UDP example', () => {
  const base = { appKey: 'billing-api', token: 'lss_secret-token-value', onClose: vi.fn() };

  it('shows no UDP section when the server has no UDP listener', () => {
    render(<TokenRevealModal {...base} />);
    expect(screen.queryByTestId('udp-example')).not.toBeInTheDocument();
  });

  it('shows the UDP target and signing rule without repeating the full token', () => {
    render(<TokenRevealModal {...base} udp={{ host: 'logs.example.com', port: 8082 }} />);

    const section = screen.getByTestId('udp-example');
    expect(section).toHaveTextContent('logs.example.com:8082');
    expect(section).toHaveTextContent('HMAC-SHA256(token, "{key}:{ts}:{nonce}:{log}")');
    expect(section).not.toHaveTextContent(base.token);
    expect(screen.getByRole('link', { name: /packet format/i })).toHaveAttribute(
      'href',
      'https://github.com/guibranco/logstream-server#udp-ingestion',
    );
  });
});
