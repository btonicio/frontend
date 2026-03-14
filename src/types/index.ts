// src/types/index.ts

export interface Signal {
  id: number | null;
  symbol: string;
  cgName?: string | null;
  cgImage?: string | null;
  signalType: 'LONG' | 'SHORT' | 'NEUTRAL';
  score: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  timestamp: string;
  tradeStatus?: 'OPEN' | 'CLOSED' | null;
  tp1Hit?: boolean;
  tp2Hit?: boolean;

  // Dati live (presenti solo per trade OPEN)
  currentClose?: number | null;
  currentScore?: number | null;
  currentRsiValue?: number | null;
  currentStochRsiK?: number | null;
  currentMacdHistogram?: number | null;
  currentAdxValue?: number | null;
  currentVolumeSpike?: number | null;
  currentAtrValue?: number | null;

  // Prezzo e livelli operativi
  close: string;
  entryPrice: string | null;
  stopLoss: string | null;
  takeProfit1: string | null;
  takeProfit2: string | null;
  takeProfit3: string | null;

  // Indicatori
  rsiValue: string | null;
  rsiScore?: string;
  stochRsiK?: string;
  stochRsiScore?: string;
  macdValue: string | null;
  macdHistogram?: string;
  macdScore?: string;
  emaCrossScore?: string;
  bollingerScore?: string;
  volumeSpike?: string;
  volumeScore?: string;
  adxValue?: string;
  adxScore?: string;
  atrValue?: string;

  processed?: boolean;
}

export interface PerformanceMetrics {
  period: string;
  totalSignals: number;
  longSignals: number;
  shortSignals: number;
  neutralSignals: number;
  highConfidence: number;
  mediumConfidence: number;
  avgScore: number;
  longRatio: number;
  // Trade lifecycle
  openTrades: number;
  closedTrades: number;
  closedSuccess: number;
  closedStopLoss: number;
  openLong: number;
  openShort: number;
  winRate: number | null;
  totalPnlPct: number | null;
  tp1HitCount: number;
  tp2HitCount: number;
  totalTpHits: number;
  partialPnlPct: number | null;
}

export interface BacktestResult {
  id: number;
  symbol: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  finalCapital: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  grossProfit: number;
  grossLoss: number;
  netProfit: number;
  maxDrawdown: number;
  sharpeRatio: number | null;
  profitFactor: number | null;
  createdAt: string;
}

export interface WebSocketMessage {
  type: 'signal' | 'heartbeat' | 'error' | 'optimization:update';
  data: any;
  timestamp: string;
}

export interface OptimizationJob {
  id: number;
  symbol: string;
  startDate: string;
  endDate: string;
  metric: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  errorMessage?: string | null;
  totalTested: number;
  bestMetricValue: number;
  paramRanges?: { combinations: number; weightPresets?: number } | null;
  topResults?: any[];
  bestParams?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ChartData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type TabType = 'signals' | 'performance' | 'backtest' | 'charts' | 'optimize' | 'history' | 'settings';

export interface TradeEntry {
  id: number;
  symbol: string;
  cgImage?: string | null;
  cgName?: string | null;
  timestamp: string;
  signalType: 'LONG' | 'SHORT';
  score: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  entryPrice: number | null;
  stopLoss: number | null;
  takeProfit1: number | null;
  takeProfit2: number | null;
  takeProfit3: number | null;
  tradeStatus: 'OPEN' | 'CLOSED';
  closeReason: 'STOP_LOSS' | 'TP3' | null;
  closePrice: number | null;
  closedAt: string | null;
  tp1Hit: boolean;
  tp2Hit: boolean;
}

export interface TradeHistoryResponse {
  trades: TradeEntry[];
  total: number;
  limit: number;
  offset: number;
  totalOpen: number;
  totalClosed: number;
}
