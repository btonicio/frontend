// src/components/tabs/ChartsTab.tsx

'use client';

import React, { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi } from 'lightweight-charts';
import { useAppStore } from '@/store/appStore';

export const ChartsTab: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const { selectedAsset } = useAppStore();

  useEffect(() => {
    if (!containerRef.current) return;

    // Create chart
    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: '#0f172a' },
        textColor: '#d1d5db',
      },
      width: containerRef.current.clientWidth,
      height: 500,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // Create candlestick series
    const series = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    seriesRef.current = series;

    // Sample data (in production, fetch from API)
    const data = [
      { time: '2024-01-01', open: 42000, high: 43000, low: 41000, close: 42500 },
      { time: '2024-01-02', open: 42500, high: 43500, low: 42000, close: 43200 },
      { time: '2024-01-03', open: 43200, high: 44000, low: 42800, close: 43800 },
      { time: '2024-01-04', open: 43800, high: 44500, low: 43200, close: 44000 },
      { time: '2024-01-05', open: 44000, high: 44800, low: 43500, close: 44300 },
    ];

    series.setData(data);
    chart.timeScale().fitContent();

    // Handle window resize
    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Asset Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold">
          {selectedAsset} Chart
        </h3>
        <div className="text-sm text-gray-400">
          1H Timeframe • {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* Chart Container */}
      <div className="card">
        <div ref={containerRef} className="w-full h-96 tv-chart-container" />
      </div>

      {/* Info */}
      <div className="bg-blue-900/20 border border-blue-500/20 rounded px-4 py-3 text-sm text-gray-400">
        💡 Tip: Use TradingView Lightweight Charts to display real-time OHLCV data with your signals overlaid.
      </div>
    </div>
  );
};
