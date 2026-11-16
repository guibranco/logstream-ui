import React, { useState } from 'react';
import { Copy, Check, AlertTriangle, ShieldCheck, Radio, ExternalLink } from 'lucide-react';
import { SERVER_UDP_DOCS_URL } from '../../lib/docs';
import { motion, AnimatePresence } from 'motion/react';

interface TokenRevealModalProps {
  appKey: string;
  token: string;
  onClose: () => void;
  /** Where the server listens for signed UDP packets; omitted when UDP ingest is off. */
  udp?: { host: string; port: number };
}

/** host:port, with IPv6 hosts bracketed so the port stays unambiguous. */
function formatHostPort(host: string, port: number): string {
  return host.includes(':') ? `[${host}]:${port}` : `${host}:${port}`;
}

export const TokenRevealModal: React.FC<TokenRevealModalProps> = ({ appKey, token, onClose, udp }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gray-900 border border-gray-800 rounded-2xl max-w-lg w-full max-h-[calc(100dvh-2rem)] overflow-y-auto shadow-2xl"
      >
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-amber-900/40 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-500 animate-pulse">
            <AlertTriangle size={32} />
          </div>
          
          <h3 className="text-2xl font-bold text-gray-100 mb-2">Copy your API token now</h3>
          <p className="text-gray-400 text-sm leading-relaxed mb-8">
            This token will <span className="text-amber-500 font-semibold underline decoration-2 underline-offset-4">NOT</span> be shown again. 
            Store it in your application's environment variables now.
          </p>

          <div className="space-y-6 text-left">
            {/* App Key Display */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500">App Key</label>
              <div className="bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 font-mono text-sm text-gray-300">
                {appKey}
              </div>
            </div>

            {/* Token Copy Section */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500">API Token</label>
              <div className="relative group">
                <div className="bg-gray-950 border border-gray-800 rounded-lg pl-4 pr-12 py-3 font-mono text-sm text-primary-400 break-all select-all ring-2 ring-primary-500/10">
                  {token}
                </div>
                <button
                  onClick={handleCopy}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-50 hover:bg-gray-800 rounded-md transition-all active:scale-95"
                  title="Copy to clipboard"
                >
                  {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                </button>
              </div>
            </div>

            {/* Example Usage */}
            <div className="space-y-2 p-4 bg-gray-950/50 rounded-xl border border-gray-800/50">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Implementation Example (Headers)</label>
              <div className="font-mono text-xs text-gray-400 space-y-1">
                <p>X-Api-Key: <span className="text-gray-200">{appKey}</span></p>
                <p>X-Api-Token: <span className="text-gray-200">{token.substring(0, 8)}...</span></p>
              </div>
            </div>

            {udp && (
              <div className="space-y-2 p-4 bg-gray-950/50 rounded-xl border border-gray-800/50" data-testid="udp-example">
                <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-600">
                  <Radio size={12} />
                  Or send over UDP (signed packets)
                </label>
                <div className="font-mono text-xs text-gray-400 space-y-1 [overflow-wrap:anywhere]">
                  <p>Target: <span className="text-gray-200">{formatHostPort(udp.host, udp.port)}</span> (UDP)</p>
                  <p>key: <span className="text-gray-200">{appKey}</span></p>
                  <p>sig: <span className="text-gray-200">HMAC-SHA256(token, "{'{key}:{ts}:{nonce}:{log}'}")</span></p>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  The token is the signing secret and is never sent. The server doesn't reply to UDP packets, so invalid ones are dropped silently.{' '}
                  <a
                    href={SERVER_UDP_DOCS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-primary-400 hover:text-primary-300"
                  >
                    Packet format <ExternalLink size={10} />
                  </a>
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 bg-gray-900 border-t border-gray-800">
          <button
            onClick={onClose}
            className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-primary-900/20 flex items-center justify-center gap-2"
          >
            <ShieldCheck size={20} />
            I've saved the token securely
          </button>
        </div>
      </motion.div>
    </div>
  );
};
