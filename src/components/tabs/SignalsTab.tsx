// src/components/tabs/SignalsTab.tsx

'use client';

import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import { useAppStore } from '@/store/appStore';
import { SignalCard } from '@/components/SignalCard';
import { signalApi } from '@/services/api';
import { Signal } from '@/types';

export const SignalsTab: React.FC = () => {
  const { signals, setSignals } = useAppStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'LONG_OPEN' | 'SHORT_OPEN' | 'NO_TRADE'>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'score' | 'none'>('none');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading, error, mutate } = useSWR<Signal[]>(
    '/signals/current',
    () => signalApi.getCurrent(),
    { refreshInterval: 5000, dedupingInterval: 2000 }
  );

  useEffect(() => {
    if (data) {
      setSignals(data);
    }
  }, [data, setSignals]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await mutate();
    setIsRefreshing(false);
  };

  // signals è già 1 per asset (deduplicato dallo store)
  const latestPerAsset = signals;

  // Contatori basati sugli asset unici con trade OPEN
  const openBySymbol = new Map(signals.filter(s => s.tradeStatus === 'OPEN').map(s => [s.symbol, s]));
  const openLongAssets  = Array.from(openBySymbol.values()).filter(s => s.signalType === 'LONG');
  const openShortAssets = Array.from(openBySymbol.values()).filter(s => s.signalType === 'SHORT');
  const openAnyAssets   = Array.from(openBySymbol.values());
  // Neutral = asset senza trade OPEN
  const noTradeAssets   = latestPerAsset.filter(s => !openBySymbol.has(s.symbol));

  // Filtra i segnali in base al filtro selezionato
  const filteredSignals = (() => {
    if (filter === 'ALL')        return signals;
    if (filter === 'OPEN')       return signals.filter((s) => s.tradeStatus === 'OPEN');
    if (filter === 'LONG_OPEN')  return signals.filter((s) => s.tradeStatus === 'OPEN' && s.signalType === 'LONG');
    if (filter === 'SHORT_OPEN') return signals.filter((s) => s.tradeStatus === 'OPEN' && s.signalType === 'SHORT');
    if (filter === 'NO_TRADE')   return latestPerAsset.filter((s) => !openBySymbol.has(s.symbol));
    return signals;
  })();

  // Ordina i segnali
  const sortedSignals = [...filteredSignals].sort((a, b) => {
    // Trade aperti sempre prima
    const aOpen = a.tradeStatus === 'OPEN' ? 0 : 1;
    const bOpen = b.tradeStatus === 'OPEN' ? 0 : 1;
    if (aOpen !== bOpen) return aOpen - bOpen;

    if (sortBy === 'name') {
      const comparison = a.symbol.localeCompare(b.symbol);
      return sortOrder === 'asc' ? comparison : -comparison;
    } else if (sortBy === 'score') {
      const scoreA = parseFloat(a.score);
      const scoreB = parseFloat(b.score);
      return sortOrder === 'asc' ? scoreA - scoreB : scoreB - scoreA;
    }
    return 0;
  });

  const handleSort = (type: 'name' | 'score') => {
    if (sortBy === type) {
      // Toggle order
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New sort type
      setSortBy(type);
      setSortOrder(type === 'score' ? 'desc' : 'asc'); // Default: score desc, name asc
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards / Filter Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <button
          onClick={() => setFilter('ALL')}
          className={`card cursor-pointer transition-all hover:scale-105 ${
            filter === 'ALL' ? 'ring-2 ring-blue-500 bg-blue-900/20' : ''
          }`}
        >
          <div className="text-gray-400 text-xs mb-1">Tutti</div>
          <div className="text-2xl font-bold text-blue-400">{latestPerAsset.length}</div>
        </button>
        <button
          onClick={() => setFilter('OPEN')}
          className={`card cursor-pointer transition-all hover:scale-105 ${
            filter === 'OPEN' ? 'ring-2 ring-blue-400 bg-blue-900/30' : ''
          }`}
        >
          <div className="text-gray-400 text-xs mb-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse inline-block" />
            Attivi
          </div>
          <div className="text-2xl font-bold text-blue-300">{openAnyAssets.length}</div>
        </button>
        <button
          onClick={() => setFilter('LONG_OPEN')}
          className={`card cursor-pointer transition-all hover:scale-105 ${
            filter === 'LONG_OPEN' ? 'ring-2 ring-green-500 bg-green-900/20' : ''
          }`}
        >
          <div className="text-gray-400 text-xs mb-1">📈 Long</div>
          <div className="text-2xl font-bold text-green-400">{openLongAssets.length}</div>
        </button>
        <button
          onClick={() => setFilter('SHORT_OPEN')}
          className={`card cursor-pointer transition-all hover:scale-105 ${
            filter === 'SHORT_OPEN' ? 'ring-2 ring-red-500 bg-red-900/20' : ''
          }`}
        >
          <div className="text-gray-400 text-xs mb-1">📉 Short</div>
          <div className="text-2xl font-bold text-red-400">{openShortAssets.length}</div>
        </button>
        <button
          onClick={() => setFilter('NO_TRADE')}
          className={`card cursor-pointer transition-all hover:scale-105 ${
            filter === 'NO_TRADE' ? 'ring-2 ring-gray-400 bg-gray-900/30' : ''
          }`}
        >
          <div className="text-gray-400 text-xs mb-1">⚪ Neutral</div>
          <div className="text-2xl font-bold text-gray-400">{noTradeAssets.length}</div>
        </button>
      </div>

      {/* Refresh Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing || isLoading}
          className="btn-primary disabled:opacity-50"
        >
          {isRefreshing || isLoading ? 'Loading...' : 'Refresh Signals'}
        </button>

        {/* Sort Controls */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Sort:</span>
          <button
            onClick={() => handleSort('name')}
            className={`px-3 py-1 rounded text-sm transition-all ${
              sortBy === 'name'
                ? 'bg-blue-600 text-white'
                : 'bg-dark-card text-gray-400 hover:bg-dark-border'
            }`}
          >
            Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <button
            onClick={() => handleSort('score')}
            className={`px-3 py-1 rounded text-sm transition-all ${
              sortBy === 'score'
                ? 'bg-blue-600 text-white'
                : 'bg-dark-card text-gray-400 hover:bg-dark-border'
            }`}
          >
            Score {sortBy === 'score' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          {sortBy !== 'none' && (
            <button
              onClick={() => setSortBy('none')}
              className="px-2 py-1 rounded text-sm text-gray-400 hover:text-white"
              title="Clear sorting"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/30 border border-red-500/30 text-red-400 px-4 py-3 rounded">
          ⚠️ Error loading signals: {error.message}
        </div>
      )}

      {/* Signals Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="text-gray-400">Loading signals...</div>
        </div>
      ) : sortedSignals.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400">
            {filter === 'ALL' ? 'No signals yet' : `No ${filter} signals`}
          </div>
        </div>
      ) : (
        <div>
          <div className="text-sm text-gray-400 mb-4">
            Showing {sortedSignals.length} of {latestPerAsset.length} assets
            {filter !== 'ALL' && (
              <button 
                onClick={() => setFilter('ALL')} 
                className="ml-2 text-blue-400 hover:underline"
              >
                (Clear filter)
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
            {sortedSignals.map((signal) => (
              <SignalCard key={signal.id ?? signal.symbol} signal={signal} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
