// src/components/tabs/BacktestTab.tsx

'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { backtestApi } from '@/services/api';
import { BacktestResult } from '@/types';

type Mode = 'backtest' | 'optimize';
type OptMetric = 'profit' | 'winRate' | 'sharpe' | 'profitFactor';

const METRIC_LABELS: Record<OptMetric, string> = {
  profit:       'Profitto netto %',
  winRate:      'Win Rate',
  sharpe:       'Sharpe Ratio',
  profitFactor: 'Profit Factor',
};

function fmt(v: number | null | undefined, decimals = 2, suffix = '') {
  if (v == null) return '—';
  return v.toFixed(decimals) + suffix;
}

export const BacktestTab: React.FC = () => {
  const [mode, setMode] = useState<Mode>('backtest');

  // Shared fields
  const [symbol, setSymbol] = useState('BTC/USDT');
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Backtest state
  const [initialCapital, setInitialCapital] = useState(1000);
  const [btLoading, setBtLoading] = useState(false);
  const [btResult, setBtResult] = useState<BacktestResult | null>(null);
  const [btError, setBtError] = useState<string | null>(null);

  // Optimize state
  const [metric, setMetric] = useState<OptMetric>('profit');
  const [maxCombinations, setMaxCombinations] = useState(80);
  const [applyToAsset, setApplyToAsset] = useState(false);
  const [optLoading, setOptLoading] = useState(false);
  const [optResult, setOptResult] = useState<any | null>(null);
  const [optError, setOptError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyMsg, setApplyMsg] = useState<string | null>(null);

  const { data: assetsData, isLoading: assetsLoading } = useSWR(
    '/backtest/assets',
    () => backtestApi.getAssets(),
  );
  const symbols = assetsData?.assets || [];

  // ─── Backtest submit ──────────────────────────────────────────────────────
  const handleBacktest = async (e: React.FormEvent) => {
    e.preventDefault();
    setBtLoading(true);
    setBtError(null);
    setBtResult(null);
    try {
      const data = await backtestApi.run({ symbol, startDate, endDate, initialCapital });
      setBtResult(data);
    } catch (err: any) {
      setBtError(err.response?.data?.message || err.response?.data?.error || 'Backtest failed');
    } finally {
      setBtLoading(false);
    }
  };

  // ─── Optimize submit ──────────────────────────────────────────────────────
  const handleOptimize = async (e: React.FormEvent) => {
    e.preventDefault();
    setOptLoading(true);
    setOptError(null);
    setOptResult(null);
    setApplyMsg(null);
    try {
      const data = await backtestApi.optimize({ symbol, startDate, endDate, metric, maxCombinations, applyToAsset });
      setOptResult(data);
    } catch (err: any) {
      setOptError(err.response?.data?.message || err.response?.data?.error || 'Ottimizzazione fallita');
    } finally {
      setOptLoading(false);
    }
  };

  // ─── Apply best params ────────────────────────────────────────────────────
  const handleApply = async (optimizationId: number) => {
    setApplying(true);
    setApplyMsg(null);
    try {
      const res = await backtestApi.applyOptimization(optimizationId);
      setApplyMsg(`✅ Parametri applicati a ${res.symbol}`);
    } catch (err: any) {
      setApplyMsg(`❌ ${err.response?.data?.message || 'Errore durante l\'applicazione'}`);
    } finally {
      setApplying(false);
    }
  };

  const profitLoss = btResult ? btResult.finalCapital - btResult.initialCapital : 0;
  const profitLossPct = btResult ? (profitLoss / btResult.initialCapital) * 100 : 0;

  // ─── Shared form header ───────────────────────────────────────────────────
  const sharedFields = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <div>
        <label className="block text-gray-400 text-sm mb-2">Asset</label>
        <select
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          disabled={assetsLoading}
          className="w-full bg-dark-border text-white px-4 py-2 rounded border border-dark-border focus:border-blue-500 outline-none transition disabled:opacity-50"
        >
          {assetsLoading ? <option>Caricamento...</option>
            : symbols.length === 0 ? <option>Nessun asset</option>
            : symbols.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div />
      <div>
        <label className="block text-gray-400 text-sm mb-2">Data inizio</label>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
          className="w-full bg-dark-border text-white px-4 py-2 rounded border border-dark-border focus:border-blue-500 outline-none transition" />
      </div>
      <div>
        <label className="block text-gray-400 text-sm mb-2">Data fine</label>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
          className="w-full bg-dark-border text-white px-4 py-2 rounded border border-dark-border focus:border-blue-500 outline-none transition" />
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl space-y-6">
      {/* Mode toggle */}
      <div className="flex gap-2">
        {(['backtest', 'optimize'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-5 py-2 rounded font-semibold text-sm transition ${
              mode === m ? 'bg-blue-600 text-white' : 'bg-dark-card text-gray-400 hover:text-white border border-dark-border'
            }`}
          >
            {m === 'backtest' ? '📊 Backtest' : '⚙️ Ottimizza'}
          </button>
        ))}
      </div>

      {/* ── BACKTEST ── */}
      {mode === 'backtest' && (
        <>
          <form onSubmit={handleBacktest} className="card">
            <h3 className="text-xl font-bold mb-6">Backtest singolo</h3>
            {sharedFields}
            <div className="mb-6">
              <label className="block text-gray-400 text-sm mb-2">Capitale iniziale ($)</label>
              <input type="number" value={initialCapital} onChange={(e) => setInitialCapital(Number(e.target.value))}
                min="100" step="100"
                className="w-full bg-dark-border text-white px-4 py-2 rounded border border-dark-border focus:border-blue-500 outline-none transition" />
            </div>
            {btLoading && (
              <div className="mb-3 text-xs text-yellow-500 bg-yellow-900/20 border border-yellow-700/30 rounded px-3 py-2">
                ⏳ Se è il primo backtest per questo asset/periodo, il server scarica i dati storici da Binance — potrebbe richiedere 30-60 secondi.
              </div>
            )}
            <button type="submit" disabled={btLoading} className="btn-primary disabled:opacity-50 w-full">
              {btLoading ? 'Esecuzione in corso...' : 'Avvia Backtest'}
            </button>
          </form>

          {btError && (
            <div className="bg-red-900/30 border border-red-500/30 text-red-400 px-4 py-3 rounded">⚠️ {btError}</div>
          )}

          {btResult && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card">
                  <h4 className="text-lg font-bold mb-4">Risultato</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-gray-400">Capitale iniziale</span><span className="font-mono">${btResult.initialCapital.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Capitale finale</span>
                      <span className={`font-mono ${profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>${btResult.finalCapital.toFixed(2)}</span></div>
                    <div className="border-t border-dark-border pt-3 flex justify-between">
                      <span className="text-gray-400 font-bold">Profitto netto</span>
                      <span className={`font-mono font-bold text-lg ${profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${profitLoss.toFixed(2)} ({profitLossPct.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                </div>
                <div className="card">
                  <h4 className="text-lg font-bold mb-4">Performance</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-gray-400">Trade totali</span><span className="font-mono font-bold">{btResult.totalTrades}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Win Rate</span><span className="font-mono font-bold text-green-400">{btResult.winRate.toFixed(2)}%</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Max Drawdown</span><span className="font-mono font-bold text-red-400">{btResult.maxDrawdown.toFixed(2)}%</span></div>
                    {btResult.sharpeRatio != null && (
                      <div className="flex justify-between"><span className="text-gray-400">Sharpe Ratio</span><span className="font-mono font-bold">{btResult.sharpeRatio.toFixed(4)}</span></div>
                    )}
                    {btResult.profitFactor != null && (
                      <div className="flex justify-between"><span className="text-gray-400">Profit Factor</span><span className="font-mono font-bold">{btResult.profitFactor.toFixed(3)}</span></div>
                    )}
                  </div>
                </div>
              </div>
              <div className="card">
                <h4 className="text-lg font-bold mb-4">Distribuzione trade</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex justify-between mb-2"><span className="text-gray-400">Vincenti</span><span className="font-bold text-green-400">{btResult.winningTrades}</span></div>
                    <div className="w-full bg-dark-border rounded h-3">
                      <div className="h-3 bg-green-500 rounded" style={{ width: `${btResult.totalTrades > 0 ? (btResult.winningTrades / btResult.totalTrades) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2"><span className="text-gray-400">Perdenti</span><span className="font-bold text-red-400">{btResult.losingTrades}</span></div>
                    <div className="w-full bg-dark-border rounded h-3">
                      <div className="h-3 bg-red-500 rounded" style={{ width: `${btResult.totalTrades > 0 ? (btResult.losingTrades / btResult.totalTrades) * 100 : 0}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── OTTIMIZZA ── */}
      {mode === 'optimize' && (
        <>
          <form onSubmit={handleOptimize} className="card">
            <h3 className="text-xl font-bold mb-2">Ottimizzazione parametri</h3>
            <p className="text-gray-400 text-sm mb-6">
              Grid search su soglie di entrata, pesi indicatori, livelli RSI/StochRSI. Trova la combinazione ottimale per la metrica scelta.
            </p>
            {sharedFields}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Metrica di ottimizzazione</label>
                <select value={metric} onChange={(e) => setMetric(e.target.value as OptMetric)}
                  className="w-full bg-dark-border text-white px-4 py-2 rounded border border-dark-border focus:border-blue-500 outline-none transition">
                  {Object.entries(METRIC_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Combinazioni massime</label>
                <input type="number" value={maxCombinations} onChange={(e) => setMaxCombinations(Number(e.target.value))}
                  min="10" max="500" step="10"
                  className="w-full bg-dark-border text-white px-4 py-2 rounded border border-dark-border focus:border-blue-500 outline-none transition" />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={applyToAsset} onChange={(e) => setApplyToAsset(e.target.checked)}
                    className="w-4 h-4 accent-blue-500" />
                  <span className="text-sm text-gray-300">Applica automaticamente al termine</span>
                </label>
              </div>
            </div>

            {optLoading && (
              <div className="mb-3 text-xs text-yellow-500 bg-yellow-900/20 border border-yellow-700/30 rounded px-3 py-2">
                ⏳ Grid search in corso — potrebbe richiedere 1-3 minuti in base al numero di combinazioni e candele disponibili.
              </div>
            )}
            <button type="submit" disabled={optLoading} className="btn-primary disabled:opacity-50 w-full">
              {optLoading ? `Ottimizzazione in corso...` : `Avvia Ottimizzazione (max ${maxCombinations} combinazioni)`}
            </button>
          </form>

          {optError && (
            <div className="bg-red-900/30 border border-red-500/30 text-red-400 px-4 py-3 rounded">⚠️ {optError}</div>
          )}

          {optResult && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="card">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div>
                    <h4 className="text-lg font-bold">Risultati ottimizzazione — {optResult.symbol}</h4>
                    <p className="text-gray-400 text-sm">
                      {optResult.totalTested} combinazioni testate · metrica: <span className="text-blue-400">{METRIC_LABELS[optResult.metric as OptMetric] || optResult.metric}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => handleApply(optResult.id)}
                    disabled={applying}
                    className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded font-semibold text-sm disabled:opacity-50 transition"
                  >
                    {applying ? 'Applicazione...' : '🚀 Applica migliori parametri al trading'}
                  </button>
                </div>
                {applyMsg && (
                  <div className={`text-sm px-3 py-2 rounded mb-3 ${applyMsg.startsWith('✅') ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                    {applyMsg}
                  </div>
                )}

                {/* Best params */}
                {optResult.bestParams && (
                  <div className="bg-dark-border/50 rounded p-4 mb-4">
                    <p className="text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wide">Migliori parametri trovati</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div><span className="text-gray-400">LongThreshold</span><br /><span className="font-mono font-bold text-green-400">{optResult.bestParams.longThreshold ?? '—'}</span></div>
                      <div><span className="text-gray-400">ShortThreshold</span><br /><span className="font-mono font-bold text-red-400">{optResult.bestParams.shortThreshold ?? '—'}</span></div>
                      <div><span className="text-gray-400">RSI Buy/Sell</span><br /><span className="font-mono font-bold">{optResult.bestParams.rsiBuyLevel ?? '—'} / {optResult.bestParams.rsiSellLevel ?? '—'}</span></div>
                      <div><span className="text-gray-400">Stoch OS/OB</span><br /><span className="font-mono font-bold">{optResult.bestParams.stochOversold ?? '—'} / {optResult.bestParams.stochOverbought ?? '—'}</span></div>
                    </div>
                    {optResult.bestParams.weights && (
                      <div className="mt-3 grid grid-cols-4 md:grid-cols-7 gap-2 text-xs">
                        {Object.entries(optResult.bestParams.weights as Record<string, number>).map(([k, v]) => (
                          <div key={k} className="text-center"><span className="text-gray-500 block">{k}</span><span className="font-mono text-blue-300">{(v as number).toFixed(2)}</span></div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Top results table */}
              {optResult.topResults?.length > 0 && (
                <div className="card overflow-x-auto">
                  <h4 className="text-lg font-bold mb-4">Top {optResult.topResults.length} combinazioni</h4>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 border-b border-dark-border text-left">
                        <th className="pb-2 pr-3">#</th>
                        <th className="pb-2 pr-3">LT / ST</th>
                        <th className="pb-2 pr-3">RSI B/S</th>
                        <th className="pb-2 pr-3">Stoch</th>
                        <th className="pb-2 pr-3 text-right">Profitto%</th>
                        <th className="pb-2 pr-3 text-right">Win%</th>
                        <th className="pb-2 pr-3 text-right">Sharpe</th>
                        <th className="pb-2 pr-3 text-right">PF</th>
                        <th className="pb-2 text-right">Trade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {optResult.topResults.map((r: any) => (
                        <tr key={r.rank} className={`border-b border-dark-border/50 hover:bg-dark-border/30 ${r.rank === 1 ? 'text-yellow-300' : ''}`}>
                          <td className="py-2 pr-3 font-bold">{r.rank}</td>
                          <td className="py-2 pr-3 font-mono">{r.params?.longThreshold}/{r.params?.shortThreshold}</td>
                          <td className="py-2 pr-3 font-mono">{r.params?.rsiBuyLevel}/{r.params?.rsiSellLevel}</td>
                          <td className="py-2 pr-3 font-mono">{r.params?.stochOversold}/{r.params?.stochOverbought}</td>
                          <td className={`py-2 pr-3 text-right font-mono font-bold ${r.netProfitPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmt(r.netProfitPercent, 2, '%')}</td>
                          <td className="py-2 pr-3 text-right font-mono">{fmt(r.winRate, 1, '%')}</td>
                          <td className="py-2 pr-3 text-right font-mono">{fmt(r.sharpeRatio, 3)}</td>
                          <td className="py-2 pr-3 text-right font-mono">{fmt(r.profitFactor, 3)}</td>
                          <td className="py-2 text-right font-mono">{r.totalTrades}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
