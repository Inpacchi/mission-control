import { useCallback, useEffect, useRef, useState } from 'react';
import type { WsMessage } from '@shared/types';

type MessageHandler = (msg: WsMessage) => void;

interface UseWebSocketReturn {
  connected: boolean;
  reconnecting: boolean;
  send: (msg: WsMessage) => void;
  subscribe: (channels: string[]) => void;
  unsubscribe: (channels: string[]) => void;
  addListener: (handler: MessageHandler) => () => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Set<MessageHandler>>(new Set());
  const subscribedChannelsRef = useRef<Set<string>>(new Set());
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  const getWsUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }, []);

  const dispatch = useCallback((msg: WsMessage) => {
    listenersRef.current.forEach((handler) => {
      try {
        handler(msg);
      } catch (err) {
        console.error('[ws] listener error:', err);
      }
    });
  }, []);

  const sendRaw = useCallback((msg: WsMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const resubscribe = useCallback(() => {
    const channels = Array.from(subscribedChannelsRef.current);
    if (channels.length > 0) {
      sendRaw({ channel: 'system', type: 'subscribe', channels });
    }
  }, [sendRaw]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      setConnected(true);
      setReconnecting(false);
      reconnectAttemptRef.current = 0;
      resubscribe();
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const msg = JSON.parse(event.data) as WsMessage;
        // Respond to pings
        if (msg.channel === 'system' && msg.type === 'ping') {
          sendRaw({ channel: 'system', type: 'pong' });
          return;
        }
        dispatch(msg);
      } catch {
        console.error('[ws] failed to parse message:', event.data);
      }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setConnected(false);
      scheduleReconnect();
    };

    ws.onerror = () => {
      // onclose will fire after onerror
    };
  }, [getWsUrl, dispatch, resubscribe, sendRaw]);

  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current) return;
    setReconnecting(true);
    const attempt = reconnectAttemptRef.current;
    const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
    reconnectAttemptRef.current = attempt + 1;

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
    reconnectTimerRef.current = setTimeout(() => {
      if (mountedRef.current) {
        connect();
      }
    }, delay);
  }, [connect]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const subscribe = useCallback(
    (channels: string[]) => {
      channels.forEach((ch) => subscribedChannelsRef.current.add(ch));
      sendRaw({ channel: 'system', type: 'subscribe', channels });
    },
    [sendRaw]
  );

  const unsubscribe = useCallback((channels: string[]) => {
    channels.forEach((ch) => subscribedChannelsRef.current.delete(ch));
  }, []);

  const addListener = useCallback((handler: MessageHandler) => {
    listenersRef.current.add(handler);
    return () => {
      listenersRef.current.delete(handler);
    };
  }, []);

  return {
    connected,
    reconnecting,
    send: sendRaw,
    subscribe,
    unsubscribe,
    addListener,
  };
}
