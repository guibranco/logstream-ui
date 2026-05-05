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
