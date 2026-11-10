/**
 * Seq-style message templates: the server stores the rendered message
 * ("GitHub push for guibranco/webhooks") with the template it came from
 * ("GitHub {event} for {repository}"). This lines the two up so the UI can
 * show which parts of the message are values, coloured by type as Seq does.
 */

export type TemplateValueKind = 'string' | 'number' | 'boolean' | 'null' | 'object';

export type MessageSegment =
  | { type: 'text'; text: string }
  | { type: 'value'; text: string; name: string; kind: TemplateValueKind };

export type TemplateToken =
  | { type: 'text'; text: string }
  | { type: 'placeholder'; text: string; name: string };

/**
 * `{name}` as the server renders it, plus the .NET / Serilog forms a client may
 * send already rendered: `{@name}`, `{$name}`, `{name,10}`, `{name:N2}`.
 */
const PLACEHOLDER = /\{[@$]?([A-Za-z_][A-Za-z0-9_.]*)(?:,[-+]?\d+)?(?::[^{}]*)?\}/g;

/** Past this the alignment is skipped and the message is shown as plain text. */
const MAX_PLACEHOLDERS = 50;
const MAX_LENGTH = 20_000;

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** The template split into literal text and placeholders. */
export function tokenizeTemplate(template: string): TemplateToken[] {
  const tokens: TemplateToken[] = [];
  let last = 0;
  for (const match of template.matchAll(PLACEHOLDER)) {
    const start = match.index ?? 0;
    if (start > last) tokens.push({ type: 'text', text: template.slice(last, start) });
    tokens.push({ type: 'placeholder', text: match[0], name: match[1] });
    last = start + match[0].length;
  }
  if (last < template.length) tokens.push({ type: 'text', text: template.slice(last) });
  return tokens;
}

/** Context value for a placeholder: the key itself, else a dotted walk (as MessageTemplate::lookup). */
export function lookupValue(
  context: Record<string, unknown> | null | undefined,
  name: string,
): { found: boolean; value: unknown } {
  if (!isPlainObject(context)) return { found: false, value: undefined };
  if (name in context) return { found: true, value: context[name] };
  if (!name.includes('.')) return { found: false, value: undefined };

  let node: unknown = context;
  for (const segment of name.split('.')) {
    if (!isPlainObject(node) || !(segment in node)) return { found: false, value: undefined };
    node = node[segment];
  }
  return { found: true, value: node };
}

export function valueKind(value: unknown): TemplateValueKind {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number' || typeof value === 'bigint') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'object') return 'object';
  return 'string';
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The message split into literal text and values, by matching it against the
 * template's literal parts. Matching the stored message (rather than rendering
 * the template again) keeps formats the client applied (`{amount:C}`) intact.
 * Returns null when the message does not follow the template.
 */
export function segmentMessage(
  message: string,
  template: string | null | undefined,
  context: Record<string, unknown> | null | undefined,
): MessageSegment[] | null {
  if (!template || message.length > MAX_LENGTH || template.length > MAX_LENGTH) return null;

  const tokens = tokenizeTemplate(template);
  const placeholders = tokens.filter(t => t.type === 'placeholder');
  if (placeholders.length === 0 || placeholders.length > MAX_PLACEHOLDERS) return null;

  const pattern = tokens
    .map(t => (t.type === 'text' ? escapeRegExp(t.text) : '([\\s\\S]*?)'))
    .join('');
  const match = new RegExp(`^${pattern}$`).exec(message);
  if (!match) return null;

  const segments: MessageSegment[] = [];
  const push = (segment: MessageSegment) => {
    const previous = segments[segments.length - 1];
    // Neighbouring text merges, so the output reads as the message does.
    if (segment.type === 'text' && previous?.type === 'text') previous.text += segment.text;
    else segments.push(segment);
  };

  let group = 1;
  for (const token of tokens) {
    if (token.type === 'text') {
      if (token.text) push({ type: 'text', text: token.text });
      continue;
    }
    const text = match[group++];
    const { found, value } = lookupValue(context, token.name);
    // The server leaves a placeholder it cannot resolve as written: that is text, not a value.
    if (text === '' || (!found && text === token.text)) {
      if (text) push({ type: 'text', text });
      continue;
    }
    push({ type: 'value', text, name: token.name, kind: found ? valueKind(value) : 'string' });
  }

  return segments.some(s => s.type === 'value') ? segments : null;
}
