import { useState, useEffect, useCallback, useRef } from 'react';
import { LogEntry, WSMessage, WSStatus } from '../types';

const RECONNECT_INTERVALS = [1000, 2000, 5000, 10000, 30000];
const PING_INTERVAL = 30000;

export function useWebSocket(url: string) {
  const [status, setStatus] = useState<WSStatus>('disconnected');
  const [connections, setConnections] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [buffer, setBuffer] = useState<LogEntry[]>([]);
  const [isLive, setIsLive] = useState(true);
  
  const ws = useRef<WebSocket | null>(null);
  const reconnectCount = useRef(0);
  const pingTimer = useRef<number | null>(null);

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    setStatus('reconnecting');
    const socket = new WebSocket(url);
    ws.current = socket;

    socket.onopen = () => {
      setStatus('connected');
      reconnectCount.current = 0;
      
      // Start pinging
      pingTimer.current = window.setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'ping' }));
        }
      }, PING_INTERVAL);
    };

    socket.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        
        switch (message.type) {
          case 'connected':
          case 'stats':
            if (message.connections !== undefined) setConnections(message.connections);
            if (message.data?.connections !== undefined) setConnections(message.data.connections);
            break;
          case 'log':
            const newLog = message.data as LogEntry;
            if (isLive) {
              setLogs(prev => [newLog, ...prev].slice(0, 500));
            } else {
              setBuffer(prev => [newLog, ...prev]);
            }
            break;
          case 'pong':
            // Keep alive confirmed
            break;
        }
      } catch (e) {
        console.error('Failed to parse WS message', e);
      }
    };

    socket.onclose = () => {
      setStatus('disconnected');
      if (pingTimer.current) clearInterval(pingTimer.current);
      
      // Exponential backoff
      const delay = RECONNECT_INTERVALS[Math.min(reconnectCount.current, RECONNECT_INTERVALS.length - 1)];
      setTimeout(connect, delay);
      reconnectCount.current++;
    };

    socket.onerror = () => {
      socket.close();
    };
  }, [url, isLive]);

  useEffect(() => {
    connect();
    return () => {
      if (ws.current) {
        ws.current.close();
      }
      if (pingTimer.current) clearInterval(pingTimer.current);
    };
  }, [connect]);

  const flushBuffer = useCallback(() => {
    setLogs(prev => [...buffer, ...prev].slice(0, 500));
    setBuffer([]);
  }, [buffer]);

  const clearLogs = useCallback(() => {
    setLogs([]);
    setBuffer([]);
  }, []);

  return {
    status,
    connections,
    logs,
    buffer,
    isLive,
    setIsLive,
    flushBuffer,
    clearLogs
  };
}
