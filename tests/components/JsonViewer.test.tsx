import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { JsonViewer } from '@/src/components/JsonViewer';

describe('JsonViewer', () => {
  it('renders null correctly', () => {
    render(<JsonViewer data={null} />);
    expect(screen.getByText('null')).toBeInTheDocument();
  });

  it('renders undefined correctly', () => {
    render(<JsonViewer data={undefined} />);
    expect(screen.getByText('undefined')).toBeInTheDocument();
  });

  it('renders a string correctly', () => {
    render(<JsonViewer data="hello" />);
    expect(screen.getByText('"hello"')).toBeInTheDocument();
  });

  it('renders a number correctly', () => {
    render(<JsonViewer data={42} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders a boolean correctly', () => {
    render(<JsonViewer data={true} />);
    expect(screen.getByText('true')).toBeInTheDocument();
  });

  it('renders an empty array correctly', () => {
    render(<JsonViewer data={[]} />);
    expect(screen.getByText('[]')).toBeInTheDocument();
  });

  it('renders an empty object correctly', () => {
    render(<JsonViewer data={{}} />);
    expect(screen.getByText('{}')).toBeInTheDocument();
  });

  it('renders an array with items correctly', () => {
    render(<JsonViewer data={[1, "two"]} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('"two"')).toBeInTheDocument();
  });

  it('renders an object with properties correctly', () => {
    render(<JsonViewer data={{ foo: "bar", baz: 123 }} />);
    expect(screen.getByText('"foo"')).toBeInTheDocument();
    expect(screen.getByText('"bar"')).toBeInTheDocument();
    expect(screen.getByText('"baz"')).toBeInTheDocument();
    expect(screen.getByText('123')).toBeInTheDocument();
  });
});
