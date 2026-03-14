// src/store/appStore.ts

import { create } from 'zustand';
import { Signal, WebSocketMessage, TabType } from '@/types';

interface OptimizationEvent {
  jobId: number;
  symbol: string;
  metric: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  errorMessage?: string;
}

interface AppStore {
  // State
  signals: Signal[];
  wsConnected: boolean;
  wsStatus: 'connected' | 'disconnected' | 'connecting';
  lastUpdate: Date | null;
  selectedTab: TabType;
  selectedAsset: string;
  lastOptimizationEvent: OptimizationEvent | null;

  // Actions
  setSignals: (signals: Signal[]) => void;
  addSignal: (signal: Signal) => void;
  setWsConnected: (connected: boolean) => void;
  setWsStatus: (status: 'connected' | 'disconnected' | 'connecting') => void;
  setLastUpdate: (date: Date) => void;
  setSelectedTab: (tab: TabType) => void;
  setSelectedAsset: (asset: string) => void;
  handleWebSocketMessage: (message: WebSocketMessage) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  // Initial state
  signals: [],
  wsConnected: false,
  wsStatus: 'disconnected',
  lastUpdate: null,
  selectedTab: 'signals',
  selectedAsset: 'BTC/USDT',
  lastOptimizationEvent: null,

  // Actions
  setSignals: (signals) => {
    // Un solo segnale per asset: deduplica per symbol tenendo il più recente
    const signalMap = new Map<string, Signal>();
    signals.forEach(signal => {
      const ex = signalMap.get(signal.symbol);
      if (!ex || new Date(signal.timestamp) > new Date(ex.timestamp)) {
        signalMap.set(signal.symbol, signal);
      }
    });
    set({ signals: Array.from(signalMap.values()) });
  },

  addSignal: (signal) =>
    set((state) => {
      // Rimuovi solo segnali non-OPEN per lo stesso symbol; mantieni quelli OPEN
      const filtered = state.signals.filter(
        (s) => s.symbol !== signal.symbol || s.tradeStatus === 'OPEN'
      );
      return {
        signals: [signal, ...filtered],
        lastUpdate: new Date(),
      };
    }),

  setWsConnected: (connected) =>
    set({
      wsConnected: connected,
      wsStatus: connected ? 'connected' : 'disconnected',
    }),

  setWsStatus: (status) => set({ wsStatus: status }),

  setLastUpdate: (date) => set({ lastUpdate: date }),

  setSelectedTab: (tab) => set({ selectedTab: tab }),

  setSelectedAsset: (asset) => set({ selectedAsset: asset }),

  handleWebSocketMessage: (message) =>
    set((state) => {
      if (message.type === 'signal' && message.data) {
        const newSignals = [message.data, ...state.signals.filter((s) => s.symbol !== message.data.symbol)];
        return { signals: newSignals, lastUpdate: new Date(message.timestamp) };
      }
      if (message.type === 'optimization:update' && message.data) {
        return { lastOptimizationEvent: message.data as OptimizationEvent };
      }
      return state;
    }),
}));
