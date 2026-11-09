import { describe, it, expect } from 'vitest';
import { splitUrls } from '@/src/lib/linkify';

describe('splitUrls', () => {
  it('returns plain text unchanged when there is no URL', () => {
    expect(splitUrls('Mozilla/5.0')).toEqual([{ type: 'text', value: 'Mozilla/5.0' }]);
  });

  it('extracts a URL wrapped in parentheses without the closing paren', () => {
    expect(splitUrls('GStraccini-bot/1.0 (+https://github.com/apps/gstraccini-bot)')).toEqual([
      { type: 'text', value: 'GStraccini-bot/1.0 (+' },
      { type: 'url', value: 'https://github.com/apps/gstraccini-bot' },
      { type: 'text', value: ')' },
    ]);
  });

  it('drops trailing sentence punctuation from the URL', () => {
    expect(splitUrls('see http://example.com/a.')).toEqual([
      { type: 'text', value: 'see ' },
      { type: 'url', value: 'http://example.com/a' },
      { type: 'text', value: '.' },
    ]);
  });

  it('handles several URLs', () => {
    const urls = splitUrls('a https://x.io b https://y.io/z?q=1').filter((s) => s.type === 'url');
    expect(urls.map((s) => s.value)).toEqual(['https://x.io', 'https://y.io/z?q=1']);
  });
});
