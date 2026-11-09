import { describe, it, expect } from 'vitest';
import {
  MAX_CONTEXT_FILTERS,
  contextFilterErrors,
  filtersToRows,
  newContextRow,
  rowsToFilters,
  appendContextParams,
  flattenContext,
  toFilterValue,
  withContextFilter,
  withoutContextFilter,
} from '@/src/lib/contextProperties';

describe('flattenContext', () => {
  it('returns no rows for null or empty context', () => {
    expect(flattenContext(null)).toEqual([]);
    expect(flattenContext({})).toEqual([]);
  });

  it('flattens nested objects into dotted paths', () => {
    const rows = flattenContext({ user: 'ana', order: { id: 42, customer: { vip: true } } });
    expect(rows).toEqual([
      { path: 'user', value: 'ana', filterable: true },
      { path: 'order.id', value: 42, filterable: true },
      { path: 'order.customer.vip', value: true, filterable: true },
    ]);
  });

  it('keeps arrays and empty objects as display-only leaves', () => {
    const rows = flattenContext({ tags: ['a', 'b'], meta: {}, missing: null });
    expect(rows).toEqual([
      { path: 'tags', value: ['a', 'b'], filterable: false },
      { path: 'meta', value: {}, filterable: false },
      { path: 'missing', value: null, filterable: true },
    ]);
  });

  it('marks keys containing dots (and their children) as not filterable', () => {
    const rows = flattenContext({ 'a.b': 1, 'x.y': { z: 2 } });
    expect(rows.every(r => !r.filterable)).toBe(true);
  });
});

describe('toFilterValue', () => {
  it('stringifies scalars the way the server compares them', () => {
    expect(toFilterValue('ana')).toBe('ana');
    expect(toFilterValue(42)).toBe('42');
    expect(toFilterValue(1.5)).toBe('1.5');
    expect(toFilterValue(false)).toBe('false');
    expect(toFilterValue(null)).toBe('null');
  });
});

describe('context filter helpers', () => {
  it('serialises include and exclude groups as bracketed params', () => {
    const params = new URLSearchParams();
    appendContextParams(params, { context: { 'order.id': '42' }, context_not: { role: 'bot' } });
    expect([...params.entries()]).toEqual([
      ['context[order.id]', '42'],
      ['context_not[role]', 'bot'],
    ]);
  });

  it('adds a filter and moves a path between include and exclude', () => {
    let f = withContextFilter({ level: 'error' }, 'role', 'bot', false);
    expect(f).toEqual({ level: 'error', context: { role: 'bot' }, context_not: undefined });

    f = withContextFilter(f, 'role', 'bot', true);
    expect(f.context).toBeUndefined();
    expect(f.context_not).toEqual({ role: 'bot' });
  });

  it('removes a filter and drops the empty group', () => {
    const f = withoutContextFilter({ context: { role: 'bot' } }, 'role', false);
    expect(f.context).toBeUndefined();
  });
});

describe('context filter builder rows', () => {
  it('turns filters into rows and back', () => {
    const filters = { context: { 'order.id': '42' }, context_not: { role: 'bot' } };
    const rows = filtersToRows(filters);

    expect(rows.map(r => [r.key, r.value, r.exclude])).toEqual([
      ['order.id', '42', false],
      ['role', 'bot', true],
    ]);
    expect(rowsToFilters(rows)).toEqual(filters);
  });

  it('ignores draft rows and trims keys', () => {
    const rows = [newContextRow(' code ', 'x'), newContextRow('', 'y'), newContextRow('k', '')];
    expect(rowsToFilters(rows)).toEqual({ context: { code: 'x' }, context_not: undefined });
  });

  it('lets a later row win when the same path appears twice', () => {
    const rows = [newContextRow('role', 'bot'), newContextRow('role', 'bot', true)];
    expect(rowsToFilters(rows)).toEqual({ context: undefined, context_not: { role: 'bot' } });
  });
});

describe('contextFilterErrors', () => {
  it('accepts valid input and drafts', () => {
    expect(contextFilterErrors([newContextRow('order.id', '1'), newContextRow()], 'card')).toEqual([]);
  });

  it('flags paths with empty segments', () => {
    expect(contextFilterErrors([newContextRow('order..id', '1')], undefined)).toHaveLength(1);
    expect(contextFilterErrors([newContextRow('order.', '1')], undefined)).toHaveLength(1);
  });

  it('flags a search term shorter than 3 characters', () => {
    expect(contextFilterErrors([], ' ab ')).toEqual(['Context search needs at least 3 characters']);
  });

  it('flags more conditions than the server accepts', () => {
    const rows = Array.from({ length: MAX_CONTEXT_FILTERS + 1 }, (_, i) => newContextRow(`k${i}`, 'v'));
    expect(contextFilterErrors(rows, undefined)).toEqual([`At most ${MAX_CONTEXT_FILTERS} context filters are allowed`]);
  });
});
