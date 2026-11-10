import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchLogs } from '@/src/lib/fetchLogs';

const ok = () => ({ ok: true, status: 200, json: async () => ({ total: 0, limit: 100, offset: 0, entries: [] }) });

afterEach(() => vi.unstubAllGlobals());

const requestedQuery = async (filters: Parameters<typeof fetchLogs>[2]) => {
  const fetchMock = vi.fn().mockResolvedValue(ok());
  vi.stubGlobal('fetch', fetchMock);
  await fetchLogs('https://logs.example.com', 'secret', filters, 100, 0);
  return new URL(fetchMock.mock.calls[0][0]).searchParams;
};

describe('fetchLogs query', () => {
  it('sends several levels and app keys as lists', async () => {
    const q = await requestedQuery({ level: ['error', 'critical'], app_key: ['a-api', 'b-api'] });
    expect(q.getAll('level[]')).toEqual(['error', 'critical']);
    expect(q.getAll('app_key[]')).toEqual(['a-api', 'b-api']);
    expect(q.has('level')).toBe(false);
  });

  it('sends a single value plainly, so older servers understand it', async () => {
    const q = await requestedQuery({ level: ['error'], app_key: 'a-api' });
    expect(q.get('level')).toBe('error');
    expect(q.get('app_key')).toBe('a-api');
    expect(q.has('level[]')).toBe(false);
  });

  it('sends dates in UTC and never the range key', async () => {
    const q = await requestedQuery({ range: '1d', date_from: '2026-11-09T10:00:00.000Z' });
    expect(q.get('date_from')).toBe('2026-11-09 10:00:00.000');
    expect(q.has('range')).toBe(false);
  });
});
