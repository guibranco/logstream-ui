import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppKeyPicker } from '@/src/components/search/AppKeyPicker';

const options = [
  { appKey: 'orders-api', name: 'Orders' },
  { appKey: 'billing-api', name: 'Billing' },
  { appKey: 'gstraccini-bot', name: 'GStraccini' },
];

const open = () => fireEvent.click(screen.getByTestId('app-key-button'));

describe('AppKeyPicker', () => {
  it('lists the registered apps sorted, with their names', () => {
    render(<AppKeyPicker selected={[]} options={options} multiple onChange={vi.fn()} />);
    expect(screen.getByTestId('app-key-button')).toHaveTextContent('All apps');
    open();
    const items = screen.getAllByRole('option').map(o => o.textContent);
    expect(items).toEqual(['billing-apiBilling', 'gstraccini-botGStraccini', 'orders-apiOrders']);
  });

  it('adds and removes apps when several can be selected', () => {
    const onChange = vi.fn();
    render(<AppKeyPicker selected={['billing-api']} options={options} multiple onChange={onChange} />);
    expect(screen.getByTestId('app-key-button')).toHaveTextContent('billing-api');
    open();
    fireEvent.click(screen.getByRole('option', { name: /orders-api/ }));
    expect(onChange).toHaveBeenLastCalledWith(['billing-api', 'orders-api']);
    fireEvent.click(screen.getByRole('option', { name: /billing-api/ }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('shows how many more are selected', () => {
    render(<AppKeyPicker selected={['billing-api', 'orders-api']} options={options} multiple onChange={vi.fn()} />);
    expect(screen.getByTestId('app-key-button')).toHaveTextContent('billing-api +1');
  });

  it('replaces the app when only one can be selected', () => {
    const onChange = vi.fn();
    render(<AppKeyPicker selected={['billing-api']} options={options} multiple={false} onChange={onChange} />);
    open();
    fireEvent.click(screen.getByRole('option', { name: /orders-api/ }));
    expect(onChange).toHaveBeenLastCalledWith(['orders-api']);
  });

  it('searches by key or name and accepts an unlisted key', () => {
    const onChange = vi.fn();
    render(<AppKeyPicker selected={[]} options={options} multiple onChange={onChange} />);
    open();
    fireEvent.change(screen.getByLabelText('Find an app'), { target: { value: 'bill' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);

    fireEvent.change(screen.getByLabelText('Find an app'), { target: { value: 'payments-api' } });
    fireEvent.click(screen.getByText('Filter by “payments-api”'));
    expect(onChange).toHaveBeenLastCalledWith(['payments-api']);
  });

  it('clears the selection', () => {
    const onChange = vi.fn();
    render(<AppKeyPicker selected={['orders-api']} options={options} multiple onChange={onChange} />);
    open();
    fireEvent.click(screen.getByRole('button', { name: /all apps/i }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });
});
