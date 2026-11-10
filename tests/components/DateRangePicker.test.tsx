import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DateRangePicker } from '@/src/components/search/DateRangePicker';

describe('DateRangePicker', () => {
  it('shows "Any time" and applies a preset at once', () => {
    const onChange = vi.fn();
    render(<DateRangePicker value={{}} onChange={onChange} />);
    expect(screen.getByTestId('date-range-button')).toHaveTextContent('Any time');

    fireEvent.click(screen.getByTestId('date-range-button'));
    fireEvent.click(screen.getByText('Last 15 minutes'));
    expect(onChange).toHaveBeenCalledWith({ range: '15m' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('applies a custom from/to range', () => {
    const onChange = vi.fn();
    render(<DateRangePicker value={{}} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('date-range-button'));
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-11-09T10:00' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-11-09T11:00' } });
    fireEvent.click(screen.getByText('Apply'));
    expect(onChange).toHaveBeenCalledWith({ date_from: '2026-11-09T10:00', date_to: '2026-11-09T11:00' });
  });

  it('refuses a range that ends before it starts', () => {
    render(<DateRangePicker value={{}} onChange={vi.fn()} />);
    fireEvent.click(screen.getByTestId('date-range-button'));
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-11-09T12:00' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-11-09T11:00' } });
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Apply')).toBeDisabled();
  });

  it('labels the applied range and clears it', () => {
    const onChange = vi.fn();
    render(<DateRangePicker value={{ range: '1h' }} onChange={onChange} />);
    expect(screen.getByTestId('date-range-button')).toHaveTextContent('Last hour');
    fireEvent.click(screen.getByLabelText('Clear date range'));
    expect(onChange).toHaveBeenCalledWith({});
  });
});
