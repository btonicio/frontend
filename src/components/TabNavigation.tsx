// src/components/TabNavigation.tsx

'use client';

import React from 'react';
import { useAppStore } from '@/store/appStore';
import { TabType } from '@/types';

const tabs: { id: TabType; label: string; icon: string }[] = [
  { id: 'signals', label: 'Signals', icon: '📡' },
  { id: 'history', label: 'History', icon: '📋' },
  { id: 'performance', label: 'Performance', icon: '📊' },
  { id: 'optimize', label: 'Optimize', icon: '🔍' },
  { id: 'backtest', label: 'Backtest', icon: '⏮️' },
  { id: 'charts', label: 'Charts', icon: '📈' },
  { id: 'settings', label: 'Impostazioni', icon: '⚙️' },
];

export const TabNavigation: React.FC = () => {
  const { selectedTab, setSelectedTab } = useAppStore();

  return (
    <div className="border-b border-dark-border">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`px-6 py-3 font-semibold text-sm transition-all duration-200 flex items-center gap-2 ${
                selectedTab === tab.id
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white border-b-2 border-transparent'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
