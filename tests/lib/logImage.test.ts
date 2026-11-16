import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PALETTE,
  describeFilters,
  describeScope,
  escapeXml,
  fitText,
  imageFileName,
  logsToSvg,
} from '@/src/lib/logImage';
import { rasterScale } from '@/src/lib/exportImage';
import { LogEntry } from '@/src/types';

const entry = (i: number, overrides: Partial<LogEntry> = {}): LogEntry => {
  const timestamp = new Date(2026, 10, 16, 21, 0, 59 - i).toISOString();
  return {
    id: `id-${i}`,
    trace_id: 't',
    batch_id: null,
    app_key: 'billing',
    app_id: 'web',
    user_agent: null,
    level: 'error',
    category: 'db',
    message: `Message ${i}`,
    context: null,
    timestamp,
    created_at: timestamp,
    ...overrides,
  };
};

const parse = (svg: string) => new DOMParser().parseFromString(svg, 'image/svg+xml');
const texts = (svg: string) => Array.from(parse(svg).querySelectorAll('text')).map(t => t.textContent);

describe('escapeXml', () => {
  it('escapes markup and drops characters XML forbids', () => {
    expect(escapeXml(`<a href="x">&'\u0001</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&apos;&lt;/a&gt;');
  });
});

describe('fitText', () => {
  it('keeps short text and cuts long text with an ellipsis', () => {
    expect(fitText('short', 10)).toBe('short');
    expect(fitText('abcdefghij', 5)).toBe('abcd…');
  });

  it('puts multi-line messages on one line', () => {
    expect(fitText('first\n  second', 40)).toBe('first ⏎ second');
  });

  it('does not split surrogate pairs', () => {
    expect(fitText('😀😀😀😀', 3)).toBe('😀😀…');
  });
});

describe('describeScope', () => {
  it('describes a selection against what is loaded', () => {
    expect(describeScope(3, { scope: 'selection', loadedCount: 1200 })).toBe('3 selected of 1,200 loaded');
  });

  it('describes the view against what matches', () => {
    expect(describeScope(50, { scope: 'view', total: 4512 })).toBe('50 events (of 4,512 matching)');
    expect(describeScope(1, { scope: 'view', total: 1 })).toBe('1 event');
  });
});

describe('describeFilters', () => {
  it('lists the active filters', () => {
    expect(describeFilters({
      app_key: ['billing', 'auth'],
      level: 'error',
      search: 'timeout',
      context: { 'user.id': '42' },
      context_not: { env: 'dev' },
      range: '24h',
    })).toBe('app: billing, auth · level: error · "timeout" · user.id = 42 · env ≠ dev · range: 24h');
  });

  it('is empty without filters', () => {
    expect(describeFilters(undefined)).toBe('');
    expect(describeFilters({})).toBe('');
  });
});

describe('logsToSvg', () => {
  it('draws a well-formed SVG with one row per event, in the order given', () => {
    const logs = [entry(0), entry(1, { level: 'info', message: 'Hello <world> & "you"' })];
    const image = logsToSvg(logs, { scope: 'view', total: 2, exportedAt: new Date(2026, 10, 16, 21, 39), version: '1.2.3' });
    const doc = parse(image.svg);
    expect(doc.querySelector('parsererror')).toBeNull();
    expect(doc.documentElement.getAttribute('width')).toBe(String(image.width));
    expect(doc.documentElement.getAttribute('height')).toBe(String(image.height));
    expect(image.rows).toBe(2);
    const all = texts(image.svg);
    expect(all).toContain('Message 0');
    expect(all).toContain('Hello <world> & "you"');
    expect(all.indexOf('Message 0')).toBeLessThan(all.indexOf('Hello <world> & "you"'));
    expect(all).toContain('ERROR');
    expect(all).toContain('INFO');
    expect(all.some(t => t?.startsWith('2 events'))).toBe(true);
    expect(all).toContain('Exported 2026-11-16 21:39:00 · logstream-ui 1.2.3');
  });

  it('prints the filters in the header', () => {
    const image = logsToSvg([entry(0)], { scope: 'view', filters: { level: 'error' } });
    expect(texts(image.svg)).toContain('Filters: level: error');
  });

  it('colours level badges from the palette', () => {
    const palette = { ...DEFAULT_PALETTE, levels: { ...DEFAULT_PALETTE.levels, warning: { fg: 'rgb(1,2,3)', bg: 'rgb(4,5,6)' } } };
    const image = logsToSvg([entry(0, { level: 'warning' })], { scope: 'view', palette });
    expect(image.svg).toContain('fill="rgb(4,5,6)"');
    expect(image.svg).toContain('fill="rgb(1,2,3)"');
  });

  it('caps the rows and says how many were left out', () => {
    const logs = Array.from({ length: 12 }, (_, i) => entry(i));
    const image = logsToSvg(logs, { scope: 'selection', maxRows: 10 });
    expect(image.rows).toBe(10);
    expect(texts(image.svg).some(t => t?.startsWith('2 more events not shown'))).toBe(true);
    expect(texts(image.svg)).not.toContain('Message 11');
  });

  it('cuts long messages to the message column', () => {
    const image = logsToSvg([entry(0, { message: 'x'.repeat(2000) })], { scope: 'view', width: 1280 });
    const message = texts(image.svg).find(t => t?.startsWith('xxx'))!;
    expect(message.endsWith('…')).toBe(true);
    expect(message.length).toBeLessThan(200);
  });

  it('still draws an image without events', () => {
    const image = logsToSvg([], { scope: 'view' });
    expect(texts(image.svg)).toContain('No events');
  });
});

describe('imageFileName', () => {
  const at = new Date(2026, 10, 16, 21, 39, 5);
  it('names the file after scope, count, time and format', () => {
    expect(imageFileName('selection', 3, 'png', at)).toBe('logstream-selected-3-20261116-213905.png');
    expect(imageFileName('view', 120, 'jpeg', at)).toBe('logstream-events-120-20261116-213905.jpg');
    expect(imageFileName('view', 1, 'svg', at)).toBe('logstream-events-1-20261116-213905.svg');
  });
});

describe('rasterScale', () => {
  it('draws small images at twice the size', () => {
    expect(rasterScale(1280, 800)).toBe(2);
  });

  it('shrinks the scale for tall images to stay within canvas limits', () => {
    const scale = rasterScale(1280, 12_000);
    expect(scale).toBeLessThan(2);
    expect(1280 * scale * 12_000 * scale).toBeLessThanOrEqual(16_000_000 + 1);
    expect(12_000 * scale).toBeLessThanOrEqual(16_384);
  });
});
