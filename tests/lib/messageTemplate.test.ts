import { describe, it, expect } from 'vitest';
import { lookupValue, segmentMessage, tokenizeTemplate, valueKind } from '@/src/lib/messageTemplate';

describe('tokenizeTemplate', () => {
  it('splits text and placeholders, including .NET forms', () => {
    expect(tokenizeTemplate('Paid {amount:C} by {@user} ({id,8})')).toEqual([
      { type: 'text', text: 'Paid ' },
      { type: 'placeholder', text: '{amount:C}', name: 'amount' },
      { type: 'text', text: ' by ' },
      { type: 'placeholder', text: '{@user}', name: 'user' },
      { type: 'text', text: ' (' },
      { type: 'placeholder', text: '{id,8}', name: 'id' },
      { type: 'text', text: ')' },
    ]);
  });

  it('leaves braces that are not placeholders as text', () => {
    expect(tokenizeTemplate('{"a": 1} {1x}')).toEqual([{ type: 'text', text: '{"a": 1} {1x}' }]);
  });
});

describe('lookupValue', () => {
  it('prefers the exact key, then walks dotted names', () => {
    expect(lookupValue({ 'a.b': 1, a: { b: 2 } }, 'a.b')).toEqual({ found: true, value: 1 });
    expect(lookupValue({ a: { b: 2 } }, 'a.b')).toEqual({ found: true, value: 2 });
    expect(lookupValue({ a: { b: 2 } }, 'a.c').found).toBe(false);
    expect(lookupValue(null, 'a').found).toBe(false);
  });
});

describe('valueKind', () => {
  it('classifies values by type', () => {
    expect(valueKind('x')).toBe('string');
    expect(valueKind(1.5)).toBe('number');
    expect(valueKind(false)).toBe('boolean');
    expect(valueKind(null)).toBe('null');
    expect(valueKind([1])).toBe('object');
  });
});

describe('segmentMessage', () => {
  it('marks each rendered value with its property name and type', () => {
    const segments = segmentMessage(
      'GitHub push for guibranco/webhooks (3 commits, forced: false)',
      'GitHub {event} for {repository.full_name} ({count} commits, forced: {forced})',
      { event: 'push', repository: { full_name: 'guibranco/webhooks' }, count: 3, forced: false },
    );
    expect(segments).toEqual([
      { type: 'text', text: 'GitHub ' },
      { type: 'value', text: 'push', name: 'event', kind: 'string' },
      { type: 'text', text: ' for ' },
      { type: 'value', text: 'guibranco/webhooks', name: 'repository.full_name', kind: 'string' },
      { type: 'text', text: ' (' },
      { type: 'value', text: '3', name: 'count', kind: 'number' },
      { type: 'text', text: ' commits, forced: ' },
      { type: 'value', text: 'false', name: 'forced', kind: 'boolean' },
      { type: 'text', text: ')' },
    ]);
  });

  it('keeps a format the client applied, as stored in the message', () => {
    const segments = segmentMessage('Charged €1,234.50', 'Charged {amount:C}', { amount: 1234.5 });
    expect(segments).toContainEqual({ type: 'value', text: '€1,234.50', name: 'amount', kind: 'number' });
  });

  it('treats a placeholder the server left unresolved as text', () => {
    const segments = segmentMessage('Hi Ana, {missing} left', 'Hi {name}, {missing} left', { name: 'Ana' });
    expect(segments).toEqual([
      { type: 'text', text: 'Hi ' },
      { type: 'value', text: 'Ana', name: 'name', kind: 'string' },
      { type: 'text', text: ', {missing} left' },
    ]);
  });

  it('renders null values as null kind', () => {
    expect(segmentMessage('User -', 'User {id}', { id: null })).toContainEqual(
      { type: 'value', text: '-', name: 'id', kind: 'null' },
    );
  });

  it('returns null when there is nothing to colour or the message does not follow the template', () => {
    expect(segmentMessage('plain', null, null)).toBeNull();
    expect(segmentMessage('plain', 'plain', null)).toBeNull();
    expect(segmentMessage('Something else', 'Hello {name}', { name: 'x' })).toBeNull();
  });
});
