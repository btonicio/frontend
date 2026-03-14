// src/hooks/useWebSocket.ts

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/store/appStore';
import { WebSocketMessage } from '@/types';

export const useWebSocket = (url: string) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const { setWsStatus, setWsConnected, handleWebSocketMessage } = useAppStore();

  const connect = useCallback(() => {
    try {
      setWsStatus('connecting');
      
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        console.log('✅ WebSocket connected');
        setWsConnected(true);
        setWsStatus('connected');
        reconnectAttemptsRef.current = 0;
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('📨 WebSocket message:', message.type, message.data ? `${message.data.symbol}→${message.data.signalType}` : '');
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setWsStatus('disconnected');
        setWsConnected(false);
      };

      wsRef.current.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        setWsConnected(false);
        setWsStatus('disconnected');

        // Reconnect logic
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          const backoffDelay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 10000);
          console.log(`Reconnecting in ${backoffDelay}ms... (attempt ${reconnectAttemptsRef.current})`);
          setTimeout(() => connect(), backoffDelay);
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      setWsStatus('disconnected');
    }
  }, [setWsStatus, setWsConnected, handleWebSocketMessage, url]);

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    ws: wsRef.current,
  };
};
