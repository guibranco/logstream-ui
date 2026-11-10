import React from 'react';
import { segmentMessage, TemplateValueKind, tokenizeTemplate } from '../lib/messageTemplate';

/** Values coloured by type, as Seq does (light themes flip these shades). */
export const VALUE_KIND_CLASS: Record<TemplateValueKind, string> = {
  string: 'text-sky-300',
  number: 'text-violet-300',
  boolean: 'text-amber-300',
  null: 'text-amber-300 italic',
  object: 'text-emerald-300',
};

interface TemplatedMessageProps {
  message: string;
  template?: string | null;
  context: Record<string, unknown> | null;
}

/**
 * The rendered message with each value that came from the template coloured
 * by its type; the property name shows on hover. Falls back to plain text when
 * the entry has no template or the message doesn't follow it.
 */
export const TemplatedMessage: React.FC<TemplatedMessageProps> = ({ message, template, context }) => {
  const segments = React.useMemo(
    () => segmentMessage(message, template, context),
    [message, template, context],
  );
  if (!segments) return <>{message}</>;

  return (
    <>
      {segments.map((segment, index) =>
        segment.type === 'text' ? (
          <React.Fragment key={index}>{segment.text}</React.Fragment>
        ) : (
          <span
            key={index}
            className={VALUE_KIND_CLASS[segment.kind]}
            title={segment.name}
            data-testid="template-value"
            data-kind={segment.kind}
          >
            {segment.text}
          </span>
        ),
      )}
    </>
  );
};

/** The template itself, with its placeholders highlighted. */
export const TemplateText: React.FC<{ template: string; className?: string }> = ({ template, className }) => (
  <span className={className}>
    {tokenizeTemplate(template).map((token, index) =>
      token.type === 'text' ? (
        <React.Fragment key={index}>{token.text}</React.Fragment>
      ) : (
        <span key={index} className="text-secondary-400" data-testid="template-placeholder">
          {token.text}
        </span>
      ),
    )}
  </span>
);
