/** A piece of text that is either plain text or a URL. */
export type TextSegment = { type: 'text'; value: string } | { type: 'url'; value: string };

/**
 * Matches http(s) URLs. Parentheses, quotes and angle brackets end a URL so that
 * user agents like `Bot/1.0 (+https://example.com/bot)` don't swallow the `)`.
 */
const URL_PATTERN = /https?:\/\/[^\s<>"'()]+/gi;

/** Punctuation that usually closes a sentence rather than belonging to the URL. */
const TRAILING_PUNCTUATION = /[.,;:!?]+$/;

/** Splits text into plain-text and URL segments, preserving the original order. */
export function splitUrls(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const url = match[0].replace(TRAILING_PUNCTUATION, '');
    const start = match.index ?? 0;

    if (start > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, start) });
    }
    segments.push({ type: 'url', value: url });
    lastIndex = start + url.length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return segments;
}
