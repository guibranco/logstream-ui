import { useState, useEffect, useRef } from 'react';
import { LogEntry, WSMessage, WSStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { useServerInfo } from './useServerInfo';

const RECONNECT_INTERVALS = [1000, 2000, 5000, 10000, 30000];
const PING_INTERVAL = 30000;

/**
 * Connection to the live stream. Each received event is handed to `onLog`;
 * what to do with it (show, hold, ignore) is the feed's decision.
 */
export function useWebSocket(onLog: (entry: LogEntry) => void, onOpen?: () => void) {
  const { config, openSettings } = useAuth();
  const { data: serverInfo } = useServerInfo();
  const isWebsocketEnabled = serverInfo?.features?.websocket !== false;

  const [status, setStatus] = useState<WSStatus>('disconnected');
  const [connections, setConnections] = useState(0);

  // Latest callbacks without reconnecting when they change.
  const onLogRef = useRef(onLog);
  onLogRef.current = onLog;
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;
  const openSettingsRef = useRef(openSettings);
  openSettingsRef.current = openSettings;

  const wsUrl = config?.wsUrl;
  const uiSecret = config?.uiSecret;

  useEffect(() => {
    if (!isWebsocketEnabled || !wsUrl || !uiSecret) {
      setStatus('disconnected');
      return;
    }

    let disposed = false;
    let socket: WebSocket | null = null;
    let pingTimer: number | null = null;
    let reconnectTimer: number | null = null;
    let reconnectCount = 0;

    const connect = () => {
      if (disposed) return;
      setStatus('reconnecting');
      socket = new WebSocket(`${wsUrl}?token=${uiSecret}`);
      const current = socket;

      current.onopen = () => {
        setStatus('connected');
        reconnectCount = 0;
        onOpenRef.current?.();
        pingTimer = window.setInterval(() => {
          if (current.readyState === WebSocket.OPEN) {
            current.send(JSON.stringify({ type: 'ping' }));
          }
        }, PING_INTERVAL);
      };

      current.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          switch (message.type) {
            case 'error': {
              const text = message.message?.toLowerCase() ?? '';
              if (text.includes('auth') || text.includes('secret')) openSettingsRef.current();
              break;
            }
            case 'connected':
            case 'stats':
              if (message.connections !== undefined) setConnections(message.connections);
              if (message.data?.connections !== undefined) setConnections(message.data.connections);
              break;
            case 'log':
              onLogRef.current(message.data as LogEntry);
              break;
            case 'pong':
              break;
          }
        } catch (e) {
          console.error('Failed to parse WS message', e);
        }
      };

      current.onclose = (event) => {
        if (pingTimer) clearInterval(pingTimer);
        pingTimer = null;
        if (disposed) return;
        setStatus('disconnected');

        // 4001 is the server's auth rejection: reconnecting won't help until the settings change.
        if (event.code === 4001) {
          openSettingsRef.current();
          return;
        }

        const delay = RECONNECT_INTERVALS[Math.min(reconnectCount, RECONNECT_INTERVALS.length - 1)];
        reconnectCount++;
        reconnectTimer = window.setTimeout(connect, delay);
      };

      current.onerror = () => current.close();
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (pingTimer) clearInterval(pingTimer);
      socket?.close();
    };
  }, [isWebsocketEnabled, wsUrl, uiSecret]);

  return { status, connections, isWebsocketEnabled };
}
