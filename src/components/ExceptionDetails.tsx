import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { ParsedException, exceptionToText } from '../lib/exception';

/** Lines of a raw exception text, coloured like Seq: headers red, frames muted. */
const RawLine: React.FC<{ line: string }> = ({ line }) => {
  const trimmed = line.trim();
  if (trimmed.startsWith('at ') || /^#\d+\s/.test(trimmed)) {
    return <span className="text-gray-500">{line}</span>;
  }
  if (trimmed.startsWith('---') || trimmed === '') {
    return <span className="text-gray-600">{line}</span>;
  }
  // Exception headers ("Type: message", "---> Inner: message", "Next Exception…").
  return <span className="text-rose-300">{line}</span>;
};

/** Pairs each line with its offset in the text, a key that stays put for a given exception. */
const keyedLines = (lines: string[], prefix: string) => {
  let offset = 0;
  return lines.map(line => {
    const key = `${prefix}${offset}`;
    offset += line.length + 1;
    return { key, line };
  });
};

/** Each exception of the chain with its depth, the order the runtime nested them in. */
const withDepth = <T,>(chain: T[]) => {
  let depth = 0;
  return chain.map(item => ({ item, depth: depth++ }));
};

export const ExceptionDetails: React.FC<{ exception: ParsedException }> = ({ exception }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(exceptionToText(exception));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div data-testid="exception-details">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Exception</h4>
        <button
          onClick={handleCopy}
          className="p-1 hover:bg-gray-800 rounded transition-all"
          aria-label="Copy exception"
          title="Copy exception"
        >
          {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} className="text-gray-500" />}
        </button>
      </div>
      <pre className="text-xs font-mono leading-relaxed bg-gray-900/50 p-4 rounded border border-rose-900/50 border-l-2 border-l-rose-500 max-h-[400px] overflow-auto whitespace-pre-wrap break-words">
        {exception.kind === 'text'
          ? keyedLines(exception.text.split(/\r?\n/), 't').map(({ key, line }) => (
              <React.Fragment key={key}>
                <RawLine line={line} />
                {'\n'}
              </React.Fragment>
            ))
          : withDepth(exception.chain).map(({ item: e, depth }) => (
              <React.Fragment key={`c${depth}`}>
                {depth > 0 && <span className="text-gray-600">{'---> '}</span>}
                {e.type && <span className="text-rose-400 font-bold">{e.type}</span>}
                {e.type && e.message && <span className="text-gray-500">: </span>}
                {e.message && <span className="text-rose-200">{e.message}</span>}
                {'\n'}
                {keyedLines(e.frames, 'f').map(({ key, line }) => (
                  <React.Fragment key={key}>
                    <span className="text-gray-500">{`   ${line}`}</span>
                    {'\n'}
                  </React.Fragment>
                ))}
              </React.Fragment>
            ))}
      </pre>
    </div>
  );
};
