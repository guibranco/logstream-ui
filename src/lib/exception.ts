/**
 * Exceptions travel in the entry's context under the `exception` key, the way
 * Seq keeps them apart from the properties (`@x`). Two shapes are accepted:
 *
 * - a string: the full text the runtime prints (`ex.ToString()` in .NET,
 *   `(string) $e` in PHP, `err.stack` in Node), inner exceptions included;
 * - an object: `{ type, message, stack_trace, inner }`, where `stack_trace` is
 *   a string or an array of frames (strings or `{ function, file, line }`) and
 *   the inner exception (also `inner_exception`, `previous` or `cause`) has the
 *   same shape.
 */

/** Context key the exception is read from. */
export const EXCEPTION_KEY = 'exception';

const INNER_KEYS = ['inner', 'inner_exception', 'previous', 'cause'] as const;
const STACK_KEYS = ['stack_trace', 'stacktrace', 'stack', 'trace'] as const;
/** Deep enough for any real chain; stops a self-referencing payload. */
const MAX_DEPTH = 10;

export interface ExceptionInfo {
  /** Exception class, e.g. `System.InvalidOperationException`; empty when unknown. */
  type: string;
  message: string;
  /** Stack frames, one per line, without leading whitespace. */
  frames: string[];
}

export type ParsedException =
  | { kind: 'text'; text: string }
  | { kind: 'chain'; chain: ExceptionInfo[] };

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const asText = (v: unknown): string => {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  // Anything else (null, objects) has no useful text form here.
  return '';
};

const formatFrame = (frame: unknown): string => {
  if (!isObject(frame)) return asText(frame).trim();
  const fn = asText(frame.function ?? frame.method);
  const cls = asText(frame.class);
  const file = asText(frame.file);
  const line = asText(frame.line);
  let name = fn || cls || '?';
  if (cls && fn) name = `${cls}.${fn}`;
  if (!file) return `at ${name}`;
  const location = line ? `${file}:${line}` : file;
  return `at ${name} in ${location}`;
};

const toFrames = (stack: unknown): string[] => {
  if (Array.isArray(stack)) return stack.map(formatFrame).filter(Boolean);
  return asText(stack)
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);
};

/** Node's `err.stack` (and some others) repeat "Type: message" as the first line. */
const dropHeader = (frames: string[], type: string, message: string): string[] => {
  const first = frames[0];
  if (first === undefined) return frames;
  const repeats = (message !== '' && first.endsWith(message)) || (type !== '' && first === type);
  return repeats ? frames.slice(1) : frames;
};

const firstOf = (node: Record<string, unknown>, keys: readonly string[]): unknown => {
  for (const key of keys) {
    if (node[key] !== undefined && node[key] !== null) return node[key];
  }
  return undefined;
};

/** The exception in a context, or null when there is none. */
export function parseException(context: Record<string, unknown> | null | undefined): ParsedException | null {
  const value = context?.[EXCEPTION_KEY];

  if (typeof value === 'string') {
    return value.trim() === '' ? null : { kind: 'text', text: value };
  }
  if (!isObject(value)) return null;

  const chain: ExceptionInfo[] = [];
  let node: unknown = value;
  while (chain.length < MAX_DEPTH) {
    if (typeof node === 'string' && node.trim() !== '') {
      // An inner exception sent as text: its first line is "Type: message".
      const [head, ...rest] = node.split(/\r?\n/);
      chain.push({ type: '', message: head.trim(), frames: toFrames(rest.join('\n')) });
      break;
    }
    if (!isObject(node)) break;
    const type = asText(node.type ?? node.class);
    const message = asText(node.message);
    chain.push({ type, message, frames: dropHeader(toFrames(firstOf(node, STACK_KEYS)), type, message) });
    node = firstOf(node, INNER_KEYS);
  }

  return chain.length > 0 ? { kind: 'chain', chain } : null;
}

/** Plain-text form of the exception, for copying (inner exceptions after the outer one, as .NET prints them). */
export function exceptionToText(parsed: ParsedException): string {
  if (parsed.kind === 'text') return parsed.text;
  return parsed.chain
    .map(e => {
      const head = [e.type, e.message].filter(Boolean).join(': ');
      return [head, ...e.frames.map(f => `   ${f}`)].join('\n');
    })
    .join('\n ---> ');
}

/**
 * The context without the stack traces, which the exception panel already
 * shows: type and message stay as properties so they can still be found or
 * excluded; a string exception is dropped entirely.
 */
export function withoutExceptionStacks(context: Record<string, unknown> | null): Record<string, unknown> | null {
  if (context?.[EXCEPTION_KEY] === undefined) return context;
  const value = context[EXCEPTION_KEY];
  const rest = { ...context };
  delete rest[EXCEPTION_KEY];

  if (!isObject(value)) return rest;

  const strip = (node: Record<string, unknown>, depth: number): Record<string, unknown> => {
    const copy: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(node)) {
      if ((STACK_KEYS as readonly string[]).includes(key)) continue;
      if ((INNER_KEYS as readonly string[]).includes(key)) {
        if (isObject(v) && depth < MAX_DEPTH) copy[key] = strip(v, depth + 1);
        continue; // inner exceptions sent as text are in the panel
      }
      copy[key] = v;
    }
    return copy;
  };

  return { ...rest, [EXCEPTION_KEY]: strip(value, 1) };
}
