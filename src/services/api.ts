// src/services/api.ts

import axios from 'axios';
import { Signal, PerformanceMetrics, BacktestResult } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

// Signal endpoints
export const signalApi = {
  getCurrent: async (): Promise<Signal[]> => {
    const { data } = await api.get('/signals/current');
    console.log('🌐 API Response:', data.length, 'signals');
    console.log('🔍 First 3:', data.slice(0, 3).map((s: Signal) => `${s.symbol}→${s.signalType}`));
    return data;
  },

  getHistory: async (symbol: string, days: number = 7): Promise<Signal[]> => {
    const { data } = await api.get(`/signals/${symbol}/history?days=${days}`);
    return data;
  },
};

// Trade history endpoints
export const tradesApi = {
  getHistory: async (params?: { status?: 'OPEN' | 'CLOSED'; asset?: string; limit?: number; offset?: number }) => {
    const { data } = await api.get('/trades/history', { params });
    return data;
  },
};

// Performance endpoints
export const performanceApi = {
  getMetrics: async (days: number = 30): Promise<PerformanceMetrics> => {
    const { data } = await api.get(`/performance?days=${days}`);
    return data;
  },
};

// Backtest endpoints
export const backtestApi = {
  getAssets: async (): Promise<{ assets: string[]; count: number }> => {
    const { data } = await api.get('/backtest/assets');
    return data;
  },

  run: async (params: {
    symbol: string;
    startDate: string;
    endDate: string;
    initialCapital?: number;
  }): Promise<BacktestResult> => {
    const { data } = await api.post('/backtest', params, { timeout: 120000 });
    return data;
  },

  getResults: async (): Promise<BacktestResult[]> => {
    const { data } = await api.get('/backtest/results');
    return data;
  },

  optimize: async (params: {
    symbol: string;
    startDate: string;
    endDate: string;
    metric?: 'profit' | 'sharpe' | 'winRate' | 'profitFactor';
    maxCombinations?: number;
    applyToAsset?: boolean;
  }): Promise<{ jobId: number }> => {
    const { data } = await api.post('/backtest/optimize', params);
    return data;
  },

  getOptimizationHistory: async (params?: {
    limit?: number;
    symbol?: string;
  }): Promise<Array<any>> => {
    const { data } = await api.get('/optimize/history', { params });
    return data;
  },

  getOptimizationById: async (id: number): Promise<any> => {
    const { data } = await api.get(`/optimize/${id}`);
    return data;
  },

  applyOptimization: async (id: number): Promise<{ symbol: string; params: any }> => {
    const { data } = await api.post(`/optimize/${id}/apply`);
    return data;
  },

  applyCustomParams: async (symbol: string, params: any): Promise<void> => {
    await api.post('/backtest/apply-params', { symbol, params });
  },

  optimizeFull: async (params: {
    symbol: string;
    startDate: string;
    endDate: string;
    maxCombinations?: number;
  }): Promise<{ jobIds: number[]; sweepId: number }> => {
    const { data } = await api.post('/backtest/optimize-full', params);
    return data;
  },

  recommend: async (jobIds: number[]): Promise<any> => {
    const { data } = await api.post('/backtest/recommend', { jobIds });
    return data;
  },

  getFullSweeps: async (): Promise<any[]> => {
    const { data } = await api.get('/backtest/full-sweeps');
    return data;
  },

  recommendForSweep: async (sweepId: number): Promise<any> => {
    const { data } = await api.post(`/backtest/full-sweeps/${sweepId}/recommend`);
    return data;
  },
};

// Settings endpoints
export const settingsApi = {
  get: async () => {
    const { data } = await api.get('/settings');
    return data;
  },
  update: async (settings: Record<string, any>) => {
    const { data } = await api.patch('/settings', settings);
    return data;
  },
  getAssets: async () => {
    const { data } = await api.get('/settings/assets');
    return data;
  },
  addAsset: async (symbol: string) => {
    const { data } = await api.post('/settings/assets', { symbol });
    return data;
  },
  toggleAsset: async (symbol: string, isActive: boolean) => {
    const { data } = await api.patch(`/settings/assets/${symbol.replace('/', '-')}`, { isActive });
    return data;
  },
  removeAsset: async (symbol: string) => {
    const { data } = await api.delete(`/settings/assets/${symbol.replace('/', '-')}`);
    return data;
  },
  refreshCoinGecko: async () => {
    const { data } = await api.post('/settings/assets/refresh-asset');
    return data;
  },
};

// Fear & Greed Index
export const fngApi = {
  getCurrent: async (): Promise<{ value: number; classification: string; timestamp: string; updatedAt: string } | null> => {
    const { data } = await api.get('/fng');
    return data;
  },
};

// Health check
export const healthApi = {
  check: async (): Promise<{ status: string; timestamp: string }> => {
    const { data } = await api.get('/health');
    return data;
  },
};

export default api;
