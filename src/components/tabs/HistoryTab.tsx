// src/components/tabs/HistoryTab.tsx

'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { tradesApi } from '@/services/api';
import { TradeEntry, TradeHistoryResponse } from '@/types';

function formatPrice(n: number | null): string {
  if (n === null || n === undefined) return '—';
  if (n >= 1000) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(4);
  return n.toFixed(6);
}

function pct(target: number | null, entry: number | null): string {
  if (!target || !entry) return '';
  const p = ((target - entry) / entry) * 100;
  return (p >= 0 ? '+' : '') + p.toFixed(2) + '%';
}

// Percentuale con segno forzato in base alla direzione del trade
// TP sempre positivo (profitto), SL sempre negativo (perdita)
function pctDir(target: number | null, entry: number | null, isProfit: boolean): string {
  if (!target || !entry) return '';
  const abs = Math.abs(((target - entry) / entry) * 100);
  const val = isProfit ? abs : -abs;
  return (val >= 0 ? '+' : '') + val.toFixed(2) + '%';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' }) +
    ' ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

const STATUS_FILTER_OPTIONS = [
  { value: undefined,   label: 'Tutti' },
  { value: 'OPEN',      label: 'Aperti' },
  { value: 'CLOSED',    label: 'Chiusi' },
] as const;

export const HistoryTab: React.FC = () => {
    const [sortBy, setSortBy] = useState<'asset' | 'score' | 'openDate' | 'closeDate' | undefined>(undefined);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<'OPEN' | 'CLOSED' | undefined>(undefined);
  const [assetFilter, setAssetFilter] = useState<string>('');
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const { data, isLoading, error } = useSWR<TradeHistoryResponse>(
    ['trades/history', statusFilter, assetFilter, offset],
    () => tradesApi.getHistory({ status: statusFilter, asset: assetFilter || undefined, limit, offset }),
    { revalidateOnFocus: false, refreshInterval: 30000 }
  );

  let trades = data?.trades ?? [];
  // Applica filtro asset
  trades = trades.filter(trade => !assetFilter || trade.symbol.toLowerCase().includes(assetFilter.toLowerCase()));
  // Applica ordinamento
  if (sortBy) {
    trades = [...trades].sort((a, b) => {
      let vA, vB;
      switch (sortBy) {
        case 'asset':
          vA = a.symbol.toLowerCase(); vB = b.symbol.toLowerCase(); break;
        case 'score':
          vA = a.score ?? 0; vB = b.score ?? 0; break;
        case 'openDate':
          vA = new Date(a.timestamp).getTime(); vB = new Date(b.timestamp).getTime(); break;
        case 'closeDate':
          vA = a.closedAt ? new Date(a.closedAt).getTime() : 0;
          vB = b.closedAt ? new Date(b.closedAt).getTime() : 0;
          break;
        default:
          vA = 0; vB = 0;
      }
      if (vA < vB) return sortDir === 'asc' ? -1 : 1;
      if (vA > vB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="space-y-4">
      {/* Header + filtri */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Storico Trade</h2>
          <p className="text-sm text-gray-400">
            {total} totali
            {' · '}<span className="text-blue-400">{data?.totalOpen ?? 0} aperti</span>
            {' · '}<span className="text-gray-400">{data?.totalClosed ?? 0} chiusi</span>
          </p>
        </div>
        <div className="flex gap-2">
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => { setStatusFilter(opt.value as any); setOffset(0); }}
              className={`px-4 py-1.5 rounded text-sm font-semibold transition-colors ${
                statusFilter === opt.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
          {/* Ricerca asset */}
          <input
            type="text"
            placeholder="Cerca asset..."
            value={assetFilter}
            onChange={e => { setAssetFilter(e.target.value); setOffset(0); }}
            className="px-3 py-1.5 rounded bg-gray-800 text-gray-200 border border-gray-700 focus:outline-none focus:border-blue-500 text-sm"
            style={{ minWidth: 140 }}
          />
        </div>
      </div>

{error && (
        <div className="bg-red-900/30 border border-red-500/30 text-red-400 px-4 py-3 rounded">
          ⚠️ Errore nel caricamento dello storico: {error.message}
        </div>
      )}

      {isLoading && (
        <div className="text-center py-12 text-gray-400">Caricamento storico...</div>
      )}

      {!isLoading && trades.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3">📭</div>
          <div className="text-lg">Nessun trade trovato</div>
          <div className="text-sm mt-1">I segnali aperti/chiusi appariranno qui</div>
        </div>
      )}

      {!isLoading && trades.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 text-left cursor-pointer" onClick={() => {
                  if (sortBy === 'asset') setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                  setSortBy('asset');
                }}>
                  Asset
                  {sortBy === 'asset'
                    ? (sortDir === 'asc' ? ' ▲' : ' ▼')
                    : <span className="ml-1 text-xs">⇅</span>
                  }
                </th>
                <th className="px-4 py-3 text-left">Dir.</th>
                <th className="px-4 py-3 text-left">Stato</th>
                <th className="px-4 py-3 text-right cursor-pointer" onClick={() => {
                  if (sortBy === 'score') setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                  setSortBy('score');
                }}>
                  Score
                  {sortBy === 'score'
                    ? (sortDir === 'asc' ? ' ▲' : ' ▼')
                    : <span className="ml-1 text-xs">⇅</span>
                  }
                </th>
                <th className="px-4 py-3 text-right">Entrata</th>
                <th className="px-4 py-3 text-right">Stop Loss</th>
                <th className="px-4 py-3 text-right">TP1</th>
                <th className="px-4 py-3 text-right">TP2</th>
                <th className="px-4 py-3 text-right">TP3</th>
                <th className="px-4 py-3 text-right">Chiusura</th>
                <th className="px-4 py-3 text-right cursor-pointer" onClick={() => {
                  if (sortBy === 'openDate') setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                  setSortBy('openDate');
                }}>
                  Data Apertura
                  {sortBy === 'openDate'
                    ? (sortDir === 'asc' ? ' ▲' : ' ▼')
                    : <span className="ml-1 text-xs">⇅</span>
                  }
                </th>
                <th className="px-4 py-3 text-right cursor-pointer" onClick={() => {
                  if (sortBy === 'closeDate') setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                  setSortBy('closeDate');
                }}>
                  Data Chiusura
                  {sortBy === 'closeDate'
                    ? (sortDir === 'asc' ? ' ▲' : ' ▼')
                    : <span className="ml-1 text-xs">⇅</span>
                  }
                </th>
              </tr>
            </thead>
            <tbody>
              {trades
                .filter(trade => !assetFilter || trade.symbol.toLowerCase().includes(assetFilter.toLowerCase()))
                .map((trade, idx) => (
                  <TradeRow key={trade.id} trade={trade} idx={idx} />
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginazione */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-400 pt-2">
          <span>Pagina {currentPage} di {totalPages}</span>
          <div className="flex gap-2">
            <button
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - limit))}
              className="px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Precedente
            </button>
            <button
              disabled={offset + limit >= total}
              onClick={() => setOffset(offset + limit)}
              className="px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Successiva →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const TradeRow: React.FC<{ trade: TradeEntry; idx: number }> = ({ trade, idx }) => {
  const isLong = trade.signalType === 'LONG';
  const isOpen = trade.tradeStatus === 'OPEN';
  const isSL = trade.closeReason === 'STOP_LOSS';
  const tp3Hit = trade.closeReason === 'TP3';

  return (
    <tr className={`border-t border-gray-700/50 transition-colors hover:bg-gray-800/40 ${idx % 2 === 0 ? '' : 'bg-gray-900/20'}`}>
      {/* Asset */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-2">
          {trade.cgImage && (
            <img src={trade.cgImage} alt={trade.cgName ?? trade.symbol} className="w-5 h-5 rounded-full flex-shrink-0" />
          )}
          <span className="font-semibold text-white">
            {trade.symbol.replace('/USDT', '')}
            <span className="text-gray-500 text-xs">/USDT</span>
          </span>
        </div>
      </td>

      {/* Direzione */}
      <td className="px-4 py-3">
        <span className={`px-2 py-0.5 rounded text-xs font-bold ${isLong ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
          {isLong ? '↑ LONG' : '↓ SHORT'}
        </span>
      </td>

      {/* Stato */}
      <td className="px-4 py-3">
        {isOpen ? (
          <span className="flex items-center gap-1.5 text-blue-400 font-semibold text-xs">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            ATTIVO
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-gray-400 text-xs">
            <span className="w-2 h-2 rounded-full bg-gray-500" />
            CHIUSO
          </span>
        )}
      </td>

      {/* Score */}
      <td className="px-4 py-3 text-right">
        <span className={`font-semibold ${trade.score >= 75 ? 'text-yellow-400' : trade.score >= 60 ? 'text-green-400' : 'text-gray-300'}`}>
          {trade.score.toFixed(1)}
        </span>
      </td>

      {/* Entrata */}
      <td className="px-4 py-3 text-right font-mono text-gray-200 text-xs">
        ${formatPrice(trade.entryPrice)}
      </td>

      {/* Stop Loss */}
      <td className="px-4 py-3 text-right font-mono text-xs">
        <div className="text-red-400">${formatPrice(trade.stopLoss)}</div>
        <div className="text-gray-500">{pctDir(trade.stopLoss, trade.entryPrice, false)}</div>
      </td>

      {/* TP1 */}
      <td className="px-4 py-3 text-right font-mono text-xs">
        <div className={trade.tp1Hit ? 'text-green-400 font-bold' : 'text-yellow-500'}>
          ${formatPrice(trade.takeProfit1)}{trade.tp1Hit && <span className="ml-1">✓</span>}
        </div>
        <div className="text-gray-500">{pctDir(trade.takeProfit1, trade.entryPrice, true)}</div>
      </td>

      {/* TP2 */}
      <td className="px-4 py-3 text-right font-mono text-xs">
        <div className={trade.tp2Hit ? 'text-green-400 font-bold' : 'text-yellow-500'}>
          ${formatPrice(trade.takeProfit2)}{trade.tp2Hit && <span className="ml-1">✓</span>}
        </div>
        <div className="text-gray-500">{pctDir(trade.takeProfit2, trade.entryPrice, true)}</div>
      </td>

      {/* TP3 */}
      <td className="px-4 py-3 text-right font-mono text-xs">
        <div className={tp3Hit ? 'text-green-400 font-bold' : 'text-yellow-500'}>
          ${formatPrice(trade.takeProfit3)}{tp3Hit && <span className="ml-1">✓</span>}
        </div>
        <div className="text-gray-500">{pctDir(trade.takeProfit3, trade.entryPrice, true)}</div>
      </td>

      {/* Prezzo chiusura */}
      <td className="px-4 py-3 text-right font-mono text-xs">
        <div className="text-gray-200">
          {trade.closeReason && <span className="mr-1">{isSL ? '🛑' : '🎯'}</span>}
          {trade.closePrice ? `$${formatPrice(trade.closePrice)}` : '—'}
        </div>
        {trade.closePrice && (() => {
          if (!trade.entryPrice) return null;
          const raw = ((trade.closePrice - trade.entryPrice) / trade.entryPrice) * 100;
          const val = isSL ? -Math.abs(raw) : Math.abs(raw);
          const label = (val >= 0 ? '+' : '') + val.toFixed(2) + '%';
          return <div className={`mt-0.5 ${isSL ? 'text-red-400' : 'text-green-400'}`}>{label}</div>;
        })()}
      </td>

      {/* Data apertura */}
      <td className="px-4 py-3 text-right text-xs text-gray-400 whitespace-nowrap">
        {formatDate(trade.timestamp)}
      </td>

      {/* Data chiusura */}
      <td className="px-4 py-3 text-right text-xs text-gray-400 whitespace-nowrap">
        {trade.closedAt ? formatDate(trade.closedAt) : '—'}
      </td>
    </tr>
  );
};
