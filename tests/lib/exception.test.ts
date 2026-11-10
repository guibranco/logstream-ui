import { describe, it, expect } from 'vitest';
import { exceptionToText, parseException, withoutExceptionStacks } from '@/src/lib/exception';

describe('parseException', () => {
  it('returns null without an exception', () => {
    expect(parseException(null)).toBeNull();
    expect(parseException({ order: 1 })).toBeNull();
    expect(parseException({ exception: '  ' })).toBeNull();
    expect(parseException({ exception: 42 })).toBeNull();
  });

  it('keeps a string exception as text', () => {
    const text = 'System.Exception: boom\n   at A.B() in /src/A.cs:line 10';
    expect(parseException({ exception: text })).toEqual({ kind: 'text', text });
  });

  it('reads an object chain with string and frame-array stacks', () => {
    const parsed = parseException({
      exception: {
        type: 'System.InvalidOperationException',
        message: 'Charge failed',
        stack_trace: '   at Billing.Charge()\n   at Billing.Run()\n',
        inner: {
          class: 'HttpException',
          message: 'timeout',
          trace: [{ class: 'Client', function: 'send', file: '/app/Client.php', line: 12 }, 'at {main}'],
          previous: 'SocketException: reset\n   at Socket.Read()',
        },
      },
    });

    expect(parsed).toEqual({
      kind: 'chain',
      chain: [
        { type: 'System.InvalidOperationException', message: 'Charge failed', frames: ['at Billing.Charge()', 'at Billing.Run()'] },
        { type: 'HttpException', message: 'timeout', frames: ['at Client.send in /app/Client.php:12', 'at {main}'] },
        { type: '', message: 'SocketException: reset', frames: ['at Socket.Read()'] },
      ],
    });
  });

  it('drops the "Type: message" header Node puts at the top of err.stack', () => {
    const parsed = parseException({
      exception: { type: 'TypeError', message: 'x is undefined', stack_trace: 'TypeError: x is undefined\n    at run (/app/a.js:1:2)' },
    });
    expect(parsed).toEqual({ kind: 'chain', chain: [{ type: 'TypeError', message: 'x is undefined', frames: ['at run (/app/a.js:1:2)'] }] });
  });

  it('stops on a self-referencing chain', () => {
    const node: Record<string, unknown> = { type: 'Loop', message: 'again' };
    node.inner = node;
    const parsed = parseException({ exception: node });
    expect(parsed?.kind === 'chain' && parsed.chain.length).toBe(10);
  });
});

describe('exceptionToText', () => {
  it('prints the chain the way .NET does', () => {
    const parsed = parseException({
      exception: { type: 'Outer', message: 'a', stack_trace: 'at X()', inner: { type: 'Inner', message: 'b' } },
    })!;
    expect(exceptionToText(parsed)).toBe('Outer: a\n   at X()\n ---> Inner: b');
  });
});

describe('withoutExceptionStacks', () => {
  it('drops stack traces but keeps type and message filterable', () => {
    expect(
      withoutExceptionStacks({
        user: 7,
        exception: { type: 'Outer', message: 'a', stack_trace: 'at X()', inner: { type: 'Inner', stack: 'at Y()' } },
      }),
    ).toEqual({ user: 7, exception: { type: 'Outer', message: 'a', inner: { type: 'Inner' } } });
  });

  it('drops a string exception entirely', () => {
    expect(withoutExceptionStacks({ user: 7, exception: 'boom' })).toEqual({ user: 7 });
  });

  it('leaves a context without an exception untouched', () => {
    const context = { user: 7 };
    expect(withoutExceptionStacks(context)).toBe(context);
  });
});
