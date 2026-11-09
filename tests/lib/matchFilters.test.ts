import { describe, it, expect } from 'vitest';
import { matchesFilters } from '@/src/lib/matchFilters';
import { LogEntry } from '@/src/types';

const log: LogEntry = {
  id: '1',
  trace_id: 'trace-1',
  batch_id: 'batch-1',
  app_key: 'gstraccini',
  app_id: 'bot',
  user_agent: 'Mozilla/5.0 Firefox',
  level: 'error',
  category: 'Webhooks.Push',
  message: 'Request failed with 500',
  context: { order: { id: 42, paid: false }, tags: ['a', 'Beta'] },
  timestamp: '2026-11-09T10:00:00.000+00:00',
  created_at: '2026-11-09T10:00:00.000+00:00',
};

describe('matchesFilters', () => {
  it('matches with no filters', () => {
    expect(matchesFilters(log, {})).toBe(true);
  });

  it('compares app key, app id, level, trace and batch exactly', () => {
    expect(matchesFilters(log, { app_key: 'gstraccini', level: 'error' })).toBe(true);
    expect(matchesFilters(log, { app_key: 'gstrac' })).toBe(false);
    expect(matchesFilters(log, { level: 'info' })).toBe(false);
    expect(matchesFilters(log, { batch_id: 'batch-2' })).toBe(false);
  });

  it('searches message, category and user agent case-insensitively', () => {
    expect(matchesFilters(log, { search: 'FAILED' })).toBe(true);
    expect(matchesFilters(log, { category: 'webhooks' })).toBe(true);
    expect(matchesFilters(log, { user_agent: 'firefox' })).toBe(true);
    expect(matchesFilters(log, { search: 'timeout' })).toBe(false);
  });

  it('applies context find and exclude like the server', () => {
    expect(matchesFilters(log, { context: { 'order.id': '42' } })).toBe(true);
    expect(matchesFilters(log, { context: { 'order.paid': 'false' } })).toBe(true);
    expect(matchesFilters(log, { context: { 'order.id': '43' } })).toBe(false);
    expect(matchesFilters(log, { context_not: { 'order.id': '42' } })).toBe(false);
    expect(matchesFilters(log, { context_not: { 'missing.key': 'x' } })).toBe(true);
  });

  it('searches context keys and values', () => {
    expect(matchesFilters(log, { context_search: 'beta' })).toBe(true);
    expect(matchesFilters(log, { context_search: 'ORDER' })).toBe(true);
    expect(matchesFilters(log, { context_search: 'nothing' })).toBe(false);
    expect(matchesFilters({ ...log, context: null }, { context_search: 'beta' })).toBe(false);
  });

  it('respects the date range', () => {
    expect(matchesFilters(log, { date_from: '2026-11-09T09:00:00Z', date_to: '2026-11-09T11:00:00Z' })).toBe(true);
    expect(matchesFilters(log, { date_to: '2026-11-09T09:59:59Z' })).toBe(false);
    expect(matchesFilters(log, { date_from: '2026-11-09T10:00:01Z' })).toBe(false);
  });
});
