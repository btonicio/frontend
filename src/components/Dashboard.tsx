// src/components/Dashboard.tsx

'use client';

import React from 'react';
import { useAppStore } from '@/store/appStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Header } from '@/components/Header';
import { TabNavigation } from '@/components/TabNavigation';
import { SignalsTab } from '@/components/tabs/SignalsTab';
import { HistoryTab } from '@/components/tabs/HistoryTab';
import { PerformanceTab } from '@/components/tabs/PerformanceTab';
import { BacktestTab } from '@/components/tabs/BacktestTab';
import { OptimizeTab } from '@/components/tabs/OptimizeTab';
import { ChartsTab } from '@/components/tabs/ChartsTab';
import { SettingsTab } from '@/components/tabs/SettingsTab';

export const Dashboard: React.FC = () => {
  const { selectedTab } = useAppStore();
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws';

  // Initialize WebSocket
  useWebSocket(wsUrl);

  return (
    <div className="min-h-screen bg-dark-bg">
      <Header />
      <TabNavigation />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {selectedTab === 'signals' && <SignalsTab />}
        {selectedTab === 'history' && <HistoryTab />}
        {selectedTab === 'performance' && <PerformanceTab />}
        {selectedTab === 'backtest' && <BacktestTab />}
        {selectedTab === 'optimize' && <OptimizeTab />}
        {selectedTab === 'charts' && <ChartsTab />}
        {selectedTab === 'settings' && <SettingsTab />}
      </main>
    </div>
  );
};
