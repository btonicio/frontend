// src/components/SignalCard.tsx

'use client';

import React, { useState } from 'react';
import { Signal } from '@/types';
import { format } from 'date-fns';
import axios from 'axios';
import { formatPrice } from '@/utils/formatPrice';

interface SignalCardProps {
  signal: Signal;
}

export const SignalCard: React.FC<SignalCardProps> = ({ signal }) => {
  const [notifying, setNotifying] = useState(false);
  const [notified, setNotified] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  const score = parseFloat(signal.score);
  const isLong = signal.signalType === 'LONG';
  const isNeutral = signal.signalType === 'NEUTRAL';

  const entry = signal.entryPrice ? parseFloat(signal.entryPrice) : parseFloat(signal.close);
  const sl = signal.stopLoss ? parseFloat(signal.stopLoss) : null;
  const tp1 = signal.takeProfit1 ? parseFloat(signal.takeProfit1) : null;
  const tp2 = signal.takeProfit2 ? parseFloat(signal.takeProfit2) : null;
  const tp3 = signal.takeProfit3 ? parseFloat(signal.takeProfit3) : null;

  // Directional percentage: always positive = profit, negative = loss
  const pctDir = (target: number, isProfit: boolean) => {
    const raw = ((target - entry) / entry) * 100;
    const dirAware = isLong ? raw : -raw;
    const val = isProfit ? Math.abs(dirAware) : -Math.abs(dirAware);
    return (val >= 0 ? '+' : '') + val.toFixed(2) + '%';
  };

  const isOpen   = signal.tradeStatus === 'OPEN';
  const isClosed = signal.tradeStatus === 'CLOSED';
  const tp1Hit   = signal.tp1Hit === true;
  const tp2Hit   = signal.tp2Hit === true;

  // Live data for open trades
  const currentClose = isOpen && signal.currentClose != null ? signal.currentClose : null;
  const currentScore = isOpen && signal.currentScore != null ? signal.currentScore : null;
  const liveDelta    = currentClose != null ? ((currentClose - entry) / entry) * 100 : null;
  const pnlDelta     = liveDelta != null ? (isLong ? liveDelta : -liveDelta) : null;
  const pnlColor     = pnlDelta != null ? (pnlDelta >= 0 ? 'text-green-400' : 'text-red-400') : 'text-gray-400';

  // Score coloring based on thresholds (longThreshold=60, shortThreshold=40, highConfidenceLong=75, highConfidenceShort=25)
  const scoreThresholdColor = (s: number) => {
    if (s >= 75) return 'text-emerald-400';
    if (s >= 60) return 'text-green-400';
    if (s <= 25) return 'text-red-500';
    if (s <= 40) return 'text-red-400';
    return 'text-gray-400';
  };

  const borderColor = isNeutral ? 'border-gray-500/40' : isLong ? 'border-green-500/40' : 'border-red-500/40';
  const bgColor     = isNeutral ? 'bg-gray-800/20'     : isLong ? 'bg-green-900/10'     : 'bg-red-900/10';
  const badgeBg     = isNeutral ? 'bg-gray-600'        : isLong ? 'bg-green-600'        : 'bg-red-600';
  const scoreColor  = isNeutral ? 'text-gray-400'      : isLong ? 'text-green-400'      : 'text-red-400';
  const barColor    = isNeutral ? 'bg-gray-500'        : isLong ? 'bg-green-500'        : 'bg-red-500';

  const confidenceEmoji =
    signal.confidence === 'HIGH' ? '🔥' : signal.confidence === 'MEDIUM' ? '⚡' : '❓';

  // Indicator entry values (from the signal at time of creation)
  const entRsi      = signal.rsiValue      ? parseFloat(signal.rsiValue).toFixed(1)      : null;
  const entStochK   = signal.stochRsiK     ? parseFloat(signal.stochRsiK).toFixed(1)     : null;
  const entMacdHist = signal.macdHistogram ? parseFloat(signal.macdHistogram).toFixed(4)  : null;
  const entAdx      = signal.adxValue      ? parseFloat(signal.adxValue).toFixed(1)       : null;
  const entAtr      = signal.atrValue      ? parseFloat(signal.atrValue).toFixed(2)       : null;
  const entVol      = signal.volumeSpike   ? parseFloat(signal.volumeSpike).toFixed(2)    : null;

  // Indicator current values (live, only for OPEN trades)
  const curRsi      = isOpen && signal.currentRsiValue      != null ? signal.currentRsiValue!.toFixed(1)      : null;
  const curStochK   = isOpen && signal.currentStochRsiK     != null ? signal.currentStochRsiK!.toFixed(1)     : null;
  const curMacdHist = isOpen && signal.currentMacdHistogram != null ? signal.currentMacdHistogram!.toFixed(4) : null;
  const curAdx      = isOpen && signal.currentAdxValue      != null ? signal.currentAdxValue!.toFixed(1)      : null;
  const curAtr      = isOpen && signal.currentAtrValue      != null ? signal.currentAtrValue!.toFixed(2)      : null;
  const curVol      = isOpen && signal.currentVolumeSpike   != null ? signal.currentVolumeSpike!.toFixed(2)   : null;

  const indicators = [
    { label: 'RSI',        entry: entRsi,      current: curRsi,      suffix: ''  },
    { label: 'StochRSI K', entry: entStochK,   current: curStochK,   suffix: ''  },
    { label: 'MACD Hist',  entry: entMacdHist, current: curMacdHist, suffix: ''  },
    { label: 'ADX',        entry: entAdx,      current: curAdx,      suffix: ''  },
    { label: 'ATR',        entry: entAtr,      current: curAtr,      suffix: ''  },
    { label: 'Vol Spike',  entry: entVol,      current: curVol,      suffix: 'x' },
  ].filter(ind => ind.entry !== null);

  const handleNotify = async () => {
    try {
      setNotifying(true);
      const response = await axios.post(`${apiUrl}/signals/notify/${signal.id}`);
      if (response.data.success) {
        setNotified(true);
        setTimeout(() => setNotified(false), 3000);
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('Failed to send notification');
    } finally {
      setNotifying(false);
    }
  };

  return (
    <div
      className={`card border-2 relative ${borderColor} ${bgColor} group ${
        (isOpen || isClosed) ? 'pt-8' : ''
      } ${
        signal.confidence === 'HIGH' && !isOpen ? 'ring-2 ring-yellow-400 shadow-lg shadow-yellow-400/20' : ''
      } ${
        isOpen ? 'ring-2 ring-blue-500 shadow-lg shadow-blue-500/20' : ''
      }`}
    >
      {/* Trade status bar — top of card */}
      {(isOpen || isClosed) && (
        <div className={`absolute top-0 left-0 right-0 flex items-center justify-center gap-2 py-1 rounded-t-lg text-xs font-bold z-10 ${
          isOpen
            ? 'bg-blue-600/95 text-white'
            : 'bg-gray-700/95 text-gray-300'
        }`}>
          {isOpen ? (
            <>
              <span className="w-2 h-2 rounded-full bg-blue-300 animate-pulse inline-block" />
              🟢 TRADE ATTIVO
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
              ⏹ TRADE CHIUSO
            </>
          )}
        </div>
      )}
      {/* HIGH CONFIDENCE Banner */}
      {signal.confidence === 'HIGH' && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-500 to-orange-500 px-4 py-1 rounded-full text-xs font-bold text-white shadow-lg animate-pulse z-10">
          🔥 HIGH CONFIDENCE
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          {signal.cgImage && (
            <img
              src={signal.cgImage}
              alt={signal.cgName ?? signal.symbol}
              className="w-8 h-8 rounded-full flex-shrink-0"
            />
          )}
          <div>
            <h3 className="text-xl font-bold text-white mb-0.5 leading-tight">
              {signal.symbol}
              {signal.cgName && (
                <span className="ml-2 text-sm font-normal text-gray-400">{signal.cgName}</span>
              )}
            </h3>
            <p className="text-xs text-gray-400">
              {signal.timestamp && !isNaN(new Date(signal.timestamp).getTime()) ? format(new Date(signal.timestamp), 'HH:mm:ss') : '--:--:--'} · Perpetual USDT
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`${badgeBg} px-3 py-1 rounded-full font-bold text-sm text-white`}>
            {isNeutral ? '⚪ NEUTRAL' : isLong ? '📈 LONG' : '📉 SHORT'}
          </span>
          <span className="text-xs text-gray-400">
            {signal.confidence} {confidenceEmoji}
          </span>
        </div>
      </div>

      {/* Score — Entrata + Corrente */}
      <div className="mb-3 p-2.5 bg-dark-card/50 rounded">
        <div className="flex items-end justify-between mb-1.5">
          <div>
            <div className="text-gray-400 text-xs mb-0.5">{isOpen ? 'Score Entrata' : 'Score'}</div>
            <span className={`text-2xl font-bold ${scoreColor}`}>{score.toFixed(1)}</span>
          </div>
          {currentScore != null && (
            <div className="text-right">
              <div className="text-gray-400 text-xs mb-0.5">Score Corrente</div>
              <span className={`text-2xl font-bold ${scoreThresholdColor(currentScore)}`}>{currentScore.toFixed(1)}</span>
            </div>
          )}
        </div>
        <div className="w-full bg-dark-border rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${barColor}`}
            style={{ width: `${Math.min(score, 100)}%` }}
          />
        </div>
      </div>

      {/* Prezzo — Entrata / Corrente su unica riga */}
      {!isNeutral && (
        <div className="mb-2 p-2.5 bg-blue-900/20 border border-blue-500/20 rounded">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-gray-400 text-xs mb-0.5">Entrata</div>
              <div className="text-lg font-bold text-blue-300 font-mono">${formatPrice(entry)}</div>
            </div>
            {currentClose != null && (
              <>
                <div className="text-gray-500 text-base flex-shrink-0">→</div>
                <div className="text-right min-w-0">
                  <div className="text-gray-400 text-xs mb-0.5">Corrente</div>
                  <div className={`text-lg font-bold font-mono ${pnlColor}`}>${formatPrice(currentClose)}</div>
                </div>
                <div className={`text-sm font-bold font-mono flex-shrink-0 ${pnlColor}`}>
                  {pnlDelta != null ? (pnlDelta >= 0 ? '+' : '') + pnlDelta.toFixed(2) + '%' : ''}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Stop Loss — nascosto per NEUTRAL */}
      {sl !== null && !isNeutral && (
        <div className="mb-2 p-2.5 bg-red-900/20 border border-red-500/30 rounded flex justify-between items-center">
          <span className="text-red-400 text-sm font-semibold">🛑 Stop Loss</span>
          <div className="text-right">
            <div className="text-white font-mono text-sm">${formatPrice(sl)}</div>
            <div className="text-red-400 text-xs">{pctDir(sl, false)}</div>
          </div>
        </div>
      )}

      {/* Take Profit Levels — nascosti per NEUTRAL */}
      {!isNeutral && (
      <div className="space-y-1.5 mb-3">
        {tp1 !== null && (
          <div className={`p-2.5 rounded flex justify-between items-center border ${
            tp1Hit
              ? 'bg-green-600/25 border-green-400/60'
              : 'bg-green-900/15 border-green-500/20'
          }`}>
            <span className="text-green-400 text-sm font-semibold flex items-center gap-1">
              🎯 TP 1
              {tp1Hit && <span className="text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded-full">✓ HIT</span>}
            </span>
            <div className="text-right">
              <div className="font-mono text-sm text-white">${formatPrice(tp1)}</div>
              <div className="text-green-400 text-xs">{pctDir(tp1, true)}</div>
            </div>
          </div>
        )}
        {tp2 !== null && (
          <div className={`p-2.5 rounded flex justify-between items-center border ${
            tp2Hit
              ? 'bg-green-600/25 border-green-400/60'
              : 'bg-green-900/10 border-green-500/15'
          }`}>
            <span className="text-green-300 text-sm font-semibold flex items-center gap-1">
              🎯 TP 2
              {tp2Hit && <span className="text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded-full">✓ HIT</span>}
            </span>
            <div className="text-right">
              <div className="font-mono text-sm text-white">${formatPrice(tp2)}</div>
              <div className="text-green-300 text-xs">{pctDir(tp2, true)}</div>
            </div>
          </div>
        )}
        {tp3 !== null && (
          <div className="p-2.5 bg-green-900/5 border border-green-500/10 rounded flex justify-between items-center">
            <span className="text-emerald-300 text-sm font-semibold">🎯 TP 3</span>
            <div className="text-right">
              <div className="text-white font-mono text-sm">${formatPrice(tp3)}</div>
              <div className="text-emerald-300 text-xs">{pctDir(tp3, true)}</div>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Neutral info box */}
      {isNeutral && (
        <div className="mb-3 p-3 bg-gray-700/30 border border-gray-500/30 rounded text-center">
          <div className="text-gray-400 text-xs">⚪ Nessun segnale operativo</div>
          <div className="text-gray-500 text-[11px] mt-0.5">Score nella zona neutra ({parseFloat(signal.score).toFixed(1)})</div>
        </div>
      )}

      {/* Indicators — tutti gli indicatori, entrata vs corrente */}
      <div className="mb-1 p-2.5 bg-dark-card/50 rounded text-xs">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-gray-500 text-[10px] uppercase tracking-wider">Indicatori</span>
          {isOpen && <span className="text-blue-400 text-[10px]">Entrata → Corrente</span>}
        </div>
        <div className="space-y-1">
          {indicators.map(({ label, entry: entVal, current, suffix }) => (
            <div key={label} className="flex justify-between items-center">
              <span className="text-gray-400">{label}</span>
              <div className="flex items-center gap-1.5 font-mono">
                <span className="text-white">{entVal}{suffix}</span>
                {current && (
                  <>
                    <span className="text-gray-600">→</span>
                    <span className="text-blue-300">{current}{suffix}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notify button — visibile solo per segnali con ID (non live) */}
      {signal.id !== null && (
        <div className="mt-3">
          <button
            onClick={handleNotify}
            disabled={notifying}
            className={`w-full text-sm py-1.5 rounded transition-all font-semibold ${
              notified
                ? 'bg-green-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            } disabled:opacity-50`}
          >
            {notifying ? '⏳...' : notified ? '✅ Inviato!' : '🔔 Notifica Telegram'}
          </button>
        </div>
      )}
    </div>
  );
};

