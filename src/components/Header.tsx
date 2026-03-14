// src/components/Header.tsx

'use client';

import React from 'react';
import { useAppStore } from '@/store/appStore';
import { format } from 'date-fns';
import { FearGreedGauge } from './FearGreedGauge';

export const Header: React.FC = () => {
  const { wsConnected, wsStatus, lastUpdate, signals } = useAppStore();

  const getStatusColor = () => {
    if (wsStatus === 'connected') return 'text-green-400';
    if (wsStatus === 'connecting') return 'text-yellow-400';
    return 'text-red-400';
  };

  const getStatusBg = () => {
    if (wsStatus === 'connected') return 'bg-green-900/30 border-green-500/30';
    if (wsStatus === 'connecting') return 'bg-yellow-900/30 border-yellow-500/30';
    return 'bg-red-900/30 border-red-500/30';
  };

  const buyCount = signals.filter((s) => s.signalType === 'LONG').length;
  const sellCount = signals.filter((s) => s.signalType === 'SHORT').length;
  const assetCount = new Set(signals.map((s) => s.symbol)).size;

  return (
    <header className="bg-dark-card border-b border-dark-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-8">
          {/* Logo & Title */}
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              🚀 Saturia Dashboard
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Real-time technical analysis dashboard
            </p>
          </div>

          {/* Stats */}
          <div className="hidden md:flex items-center gap-6">
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">LONG</div>
              <div className="text-2xl font-bold text-green-400">{buyCount}</div>
            </div>
            <div className="w-px h-12 bg-dark-border"></div>
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">SHORT</div>
              <div className="text-2xl font-bold text-red-400">{sellCount}</div>
            </div>
            <div className="w-px h-12 bg-dark-border"></div>
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">Assets</div>
              <div className="text-2xl font-bold text-blue-400">{assetCount}</div>
            </div>
            <div className="w-px h-12 bg-dark-border"></div>
            <FearGreedGauge />
          </div>

          {/* Connection Status */}
          <div className="flex flex-col items-end gap-2">
            <div className={`status-badge status-${wsStatus} flex items-center gap-2`}>
              <div className={`w-2 h-2 rounded-full ${wsStatus === 'connected' ? 'bg-green-400' : wsStatus === 'connecting' ? 'bg-yellow-400' : 'bg-red-400'}`}></div>
              <span className="capitalize">{wsStatus}</span>
            </div>
            {lastUpdate && (
              <div className="text-xs text-gray-500">
                Updated: {format(lastUpdate, 'HH:mm:ss')}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
