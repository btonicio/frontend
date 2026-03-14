// src/components/tabs/PerformanceTab.tsx

'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { performanceApi } from '@/services/api';
import { PerformanceMetrics } from '@/types';
import { TradePerformanceChart } from './TradeHistoryChart';

function StatCard({
  label,
  value,
  sub,
  color = 'text-white',
  icon,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  color?: string;
  icon?: string;
}) {
  return (
    <div className="card">
      <div className="text-gray-400 text-xs mb-1 flex items-center gap-1">
        {icon && <span>{icon}</span>}
        {label}
      </div>
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

function BarRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between mb-1 text-sm">
        <span className="text-gray-400">{label}</span>
        <span className={`font-bold ${color}`}>{value} <span className="text-gray-500 font-normal text-xs">({pct.toFixed(1)}%)</span></span>
      </div>
      <div className="w-full bg-dark-border rounded-full h-2">
        <div className={`h-2 rounded-full transition-all ${color.replace('text-', 'bg-')}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export const PerformanceTab: React.FC = () => {
  const [days, setDays] = useState(30);

  const { data: metrics, isLoading, error } = useSWR<PerformanceMetrics>(
    `/performance?days=${days}`,
    () => performanceApi.getMetrics(days),
    { revalidateOnFocus: false, dedupingInterval: 10000, refreshInterval: 30000 }
  );

  if (error) {
    return (
      <div className="bg-red-900/30 border border-red-500/30 text-red-400 px-4 py-3 rounded">
        ⚠️ Errore nel caricamento: {error.message}
      </div>
    );
  }

  if (isLoading || !metrics) {
    return <div className="text-center py-12 text-gray-400">Caricamento metriche...</div>;
  }

  const totalNotified = metrics.openTrades + metrics.closedTrades;

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400 mr-1">Periodo:</span>
        {[7, 14, 30, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-4 py-1.5 rounded font-semibold text-sm transition-colors ${
              days === d ? 'bg-blue-600 text-white' : 'bg-dark-card text-gray-300 hover:bg-dark-border'
            }`}
          >
            {d}g
          </button>
        ))}
      </div>

      {/* ── SEZIONE TRADE ATTIVI ── */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Trade in corso</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Trade Attivi"
            value={metrics.openTrades}
            color="text-blue-400"
            icon="🟢"
            sub="notificati su Telegram"
          />
          <StatCard
            label="LONG Attivi"
            value={metrics.openLong}
            color="text-green-400"
            icon="📈"
            sub={metrics.openTrades > 0 ? `${((metrics.openLong / metrics.openTrades) * 100).toFixed(0)}% dei trade aperti` : undefined}
          />
          <StatCard
            label="SHORT Attivi"
            value={metrics.openShort}
            color="text-red-400"
            icon="📉"
            sub={metrics.openTrades > 0 ? `${((metrics.openShort / metrics.openTrades) * 100).toFixed(0)}% dei trade aperti` : undefined}
          />
          <StatCard
            label="Score Medio"
            value={metrics.avgScore.toFixed(1)}
            color="text-yellow-400"
            icon="⭐"
            sub="su tutti i segnali"
          />
        </div>
      </div>

      {/* ── SEZIONE TRADE CHIUSI ── */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Storico trade chiusi</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard
            label="Trade Chiusi"
            value={metrics.closedTrades}
            color="text-gray-300"
            icon="⏹"
            sub={`su ${totalNotified} notificati`}
          />
          <StatCard
            label="Chiusi su TP3 ✅"
            value={metrics.closedSuccess}
            color="text-green-400"
            icon="🎯"
            sub={metrics.closedTrades > 0 ? `${((metrics.closedSuccess / metrics.closedTrades) * 100).toFixed(1)}% dei chiusi` : 'nessuno ancora'}
          />
          <StatCard
            label="Chiusi su SL 🛑"
            value={metrics.closedStopLoss}
            color="text-red-400"
            icon="🛑"
            sub={metrics.closedTrades > 0 ? `${((metrics.closedStopLoss / metrics.closedTrades) * 100).toFixed(1)}% dei chiusi` : 'nessuno ancora'}
          />
          <StatCard
            label="Win Rate"
            value={metrics.winRate !== null ? `${metrics.winRate}%` : '—'}
            color={metrics.winRate !== null ? (metrics.winRate >= 50 ? 'text-green-400' : 'text-red-400') : 'text-gray-500'}
            icon="📊"
            sub={metrics.winRate !== null ? 'TP3 / trade chiusi' : 'dati insufficienti'}
          />
          <StatCard
            label="P&L Totale"
            value={metrics.totalPnlPct !== null ? `${metrics.totalPnlPct >= 0 ? '+' : ''}${metrics.totalPnlPct.toFixed(2)}%` : '—'}
            color={metrics.totalPnlPct !== null ? (metrics.totalPnlPct >= 0 ? 'text-green-400' : 'text-red-400') : 'text-gray-500'}
            icon="💰"
            sub={metrics.totalPnlPct !== null ? 'somma % trade chiusi' : 'dati insufficienti'}
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <StatCard
            label="TP1 Raggiunti"
            value={metrics.tp1HitCount}
            color="text-blue-300"
            icon="1️⃣"
            sub="su tutti i trade del periodo"
          />
          <StatCard
            label="TP2 Raggiunti"
            value={metrics.tp2HitCount}
            color="text-blue-400"
            icon="2️⃣"
            sub="su tutti i trade del periodo"
          />
          <StatCard
            label="Tot. TP Raggiunti"
            value={metrics.totalTpHits}
            color="text-cyan-400"
            icon="🎯"
            sub="TP1 + TP2 + TP3 (chiusi)"
          />
          <StatCard
            label="P&L Parziale"
            value={metrics.partialPnlPct !== null ? `${metrics.partialPnlPct >= 0 ? '+' : ''}${metrics.partialPnlPct.toFixed(2)}%` : '—'}
            color={metrics.partialPnlPct !== null ? (metrics.partialPnlPct >= 0 ? 'text-green-400' : 'text-red-400') : 'text-gray-500'}
            icon="📈"
            sub={metrics.partialPnlPct !== null ? 'chiusi + open con TP1/TP2' : 'dati insufficienti'}
          />
        </div>
      </div>

      {/* Win/Loss bar */}
      {metrics.closedTrades > 0 && (
        <div className="card">
          <h3 className="text-base font-bold mb-4">Risultati trade chiusi</h3>
          <div className="flex h-6 rounded-full overflow-hidden gap-0.5 mb-2">
            <div
              className="bg-green-500 flex items-center justify-center text-xs font-bold text-white transition-all"
              style={{ width: `${(metrics.closedSuccess / metrics.closedTrades) * 100}%` }}
            >
              {metrics.closedSuccess > 0 && `${metrics.closedSuccess} TP3`}
            </div>
            <div
              className="bg-red-500 flex items-center justify-center text-xs font-bold text-white transition-all"
              style={{ width: `${(metrics.closedStopLoss / metrics.closedTrades) * 100}%` }}
            >
              {metrics.closedStopLoss > 0 && `${metrics.closedStopLoss} SL`}
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span className="text-green-400">✅ {metrics.closedSuccess} successi</span>
            <span className="text-red-400">🛑 {metrics.closedStopLoss} stop loss</span>
          </div>
        </div>
      )}

      {/* ── SEZIONE SEGNALI GENERATI ── */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Segnali generati ({metrics.period})</h3>
        <div className="card space-y-4">
          <BarRow label="📈 LONG" value={metrics.longSignals} total={metrics.totalSignals} color="text-green-400" />
          <BarRow label="📉 SHORT" value={metrics.shortSignals} total={metrics.totalSignals} color="text-red-400" />
          <BarRow label="⚪ NEUTRAL" value={metrics.neutralSignals} total={metrics.totalSignals} color="text-gray-400" />
          <div className="border-t border-dark-border pt-3 flex justify-between text-sm text-gray-400">
            <span>Totale segnali</span>
            <span className="font-bold text-white">{metrics.totalSignals}</span>
          </div>
        </div>
      </div>

      {/* ── GRAFICO ANDAMENTO ── */}
      <TradePerformanceChart />

      {/* ── CONFIDENCE ── */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Confidence</h3>
        <div className="card space-y-4">
          <BarRow label="🔥 HIGH" value={metrics.highConfidence} total={metrics.totalSignals} color="text-yellow-400" />
          <BarRow label="⚡ MEDIUM" value={metrics.mediumConfidence} total={metrics.totalSignals} color="text-blue-400" />
          <BarRow
            label="❓ LOW"
            value={metrics.totalSignals - metrics.highConfidence - metrics.mediumConfidence}
            total={metrics.totalSignals}
            color="text-gray-400"
          />
        </div>
      </div>
    </div>
  );
};
