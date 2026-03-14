'use client';

import React, { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import useSWR from 'swr';
import { tradesApi } from '@/services/api';
import { TradeEntry, TradeHistoryResponse } from '@/types';

const ApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

type Point = { x: number; y: number };
type Range = '1d' | '7d' | '30d' | '90d' | 'all';
type ChartMode = 'area' | 'stacked100';

const RANGE_OPTIONS: { label: string; value: Range }[] = [
  { label: '24H',   value: '1d' },
  { label: '7G',    value: '7d' },
  { label: '30G',   value: '30d' },
  { label: '90G',   value: '90d' },
  { label: 'Tutto', value: 'all' },
];

const SERIES_DEF = [
  { name: 'Long',        color: '#22c55e', filter: (t: TradeEntry) => t.signalType   === 'LONG',                                   dateField: 'timestamp' as const },
  { name: 'Short',       color: '#ef4444', filter: (t: TradeEntry) => t.signalType   === 'SHORT',                                  dateField: 'timestamp' as const },
  { name: 'Stop Loss',   color: '#f97316', filter: (t: TradeEntry) => t.closeReason  === 'STOP_LOSS',                              dateField: 'closedAt'  as const },
  { name: 'TP1',         color: '#3b82f6', filter: (t: TradeEntry) => t.tp1Hit       === true,                                     dateField: 'timestamp' as const },
  { name: 'TP2',         color: '#8b5cf6', filter: (t: TradeEntry) => t.tp2Hit       === true,                                     dateField: 'timestamp' as const },
  { name: 'TP3',         color: '#a855f7', filter: (t: TradeEntry) => t.closeReason  === 'TP3',                                    dateField: 'closedAt'  as const },
  { name: 'Tot. TP',     color: '#06b6d4', filter: (t: TradeEntry) => t.tp1Hit === true || t.tp2Hit === true || t.closeReason === 'TP3', dateField: 'timestamp' as const },
] as const;

type SeriesName = typeof SERIES_DEF[number]['name'];

const STACKED_DEF = [
  { name: 'TP3',       color: '#22c55e', filter: (t: TradeEntry) => t.closeReason === 'TP3' },
  { name: 'Stop Loss', color: '#ef4444', filter: (t: TradeEntry) => t.closeReason === 'STOP_LOSS' },
  { name: 'Altri chiusi', color: '#6b7280', filter: (t: TradeEntry) => t.tradeStatus === 'CLOSED' && t.closeReason !== 'TP3' && t.closeReason !== 'STOP_LOSS' },
] as const;

function getCutoff(range: Range): number {
  if (range === 'all') return 0;
  const ms: Record<string, number> = { '1d': 86400000, '7d': 7 * 86400000, '30d': 30 * 86400000, '90d': 90 * 86400000 };
  return Date.now() - ms[range];
}

function getBucketFormat(range: Range): (d: Date) => string {
  if (range === '1d') {
    // bucket per ora: YYYY-MM-DDTHH
    return (d) => {
      const iso = d.toISOString();
      return iso.slice(0, 13); // YYYY-MM-DDTHH
    };
  }
  if (range === '7d' || range === '30d') {
    return (d) => d.toISOString().slice(0, 10); // YYYY-MM-DD
  }
  if (range === '90d') {
    // settimana: primo giorno della settimana
    return (d) => {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(d);
      mon.setDate(diff);
      return mon.toISOString().slice(0, 10);
    };
  }
  // all → mese
  return (d) => d.toISOString().slice(0, 7); // YYYY-MM
}

function formatBucketLabel(key: string, range: Range): string {
  if (range === '1d') {
    // YYYY-MM-DDTHH → "HH:00"
    const h = key.slice(11, 13);
    return `${h}:00`;
  }
  if (range === '7d' || range === '30d' || range === '90d') {
    // YYYY-MM-DD → "DD/MM"
    const [, m, d] = key.split('-');
    return `${d}/${m}`;
  }
  // YYYY-MM → "MMM YY"
  const [y, m] = key.split('-');
  const months = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
  return `${months[parseInt(m, 10) - 1]} ${y.slice(2)}`;
}

function makeCumulativePoints(items: TradeEntry[], dateField: 'timestamp' | 'closedAt' = 'timestamp'): Point[] {
  const sorted = [...items]
    .filter(t => {
      if (dateField === 'closedAt' && !t.closedAt) return false;
      const ms = new Date(dateField === 'closedAt' ? (t.closedAt as string) : t.timestamp).getTime();
      return !isNaN(ms);
    })
    .sort((a, b) => {
      const da = new Date(t_date(a, dateField)).getTime();
      const db = new Date(t_date(b, dateField)).getTime();
      return da - db;
    });

  let count = 0;
  return sorted.map(t => ({
    x: new Date(dateField === 'closedAt' ? (t.closedAt as string) : t.timestamp).getTime(),
    y: ++count,
  }));
}

function t_date(t: TradeEntry, field: 'timestamp' | 'closedAt'): string {
  return field === 'closedAt' ? (t.closedAt ?? t.timestamp) : t.timestamp;
}

function makeStackedData(trades: TradeEntry[], range: Range) {
  const closed = trades.filter(t => t.tradeStatus === 'CLOSED' && t.closedAt);
  const bucket = getBucketFormat(range);

  const bucketMap = new Map<string, { tp3: number; sl: number; altri: number }>();
  for (const t of closed) {
    const key = bucket(new Date(t.closedAt!));
    if (!bucketMap.has(key)) bucketMap.set(key, { tp3: 0, sl: 0, altri: 0 });
    const entry = bucketMap.get(key)!;
    if (t.closeReason === 'TP3') entry.tp3++;
    else if (t.closeReason === 'STOP_LOSS') entry.sl++;
    else entry.altri++;
  }

  const keys = Array.from(bucketMap.keys()).sort();
  return {
    categories: keys,
    tp3:   keys.map(k => bucketMap.get(k)!.tp3),
    sl:    keys.map(k => bucketMap.get(k)!.sl),
    altri: keys.map(k => bucketMap.get(k)!.altri),
  };
}

export const TradePerformanceChart: React.FC = () => {
  const [range, setRange]       = useState<Range>('all');
  const [hidden, setHidden]     = useState<Set<SeriesName>>(new Set());
  const [chartMode, setChartMode] = useState<ChartMode>('area');

  const { data, isLoading } = useSWR<TradeHistoryResponse>(
    'trades/history/perf-chart',
    () => tradesApi.getHistory({ limit: 10000, offset: 0 }),
    { revalidateOnFocus: false, refreshInterval: 60000 }
  );

  const allTrades = data?.trades ?? [];

  const toggleSeries = (name: SeriesName) => {
    setHidden(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  // ── Area chart data ────────────────────────────────────────────────────────
  const { series: areaSeries, totals } = useMemo(() => {
    const cutoff   = getCutoff(range);
    const filtered = cutoff > 0
      ? allTrades.filter(t => new Date(t.timestamp).getTime() >= cutoff)
      : allTrades;

    const buildPoints = (def: typeof SERIES_DEF[number]) => {
      const items = filtered.filter(def.filter);
      return hidden.has(def.name) ? [] : makeCumulativePoints(items, def.dateField);
    };

    return {
      series: SERIES_DEF.map(def => ({ name: def.name, data: buildPoints(def) })),
      totals: Object.fromEntries(
        SERIES_DEF.map(def => [def.name, filtered.filter(def.filter).length])
      ) as Record<SeriesName, number>,
    };
  }, [allTrades, range, hidden]);

  // ── Stacked 100% data ─────────────────────────────────────────────────────
  const stackedData = useMemo(() => {
    const cutoff   = getCutoff(range);
    const filtered = cutoff > 0
      ? allTrades.filter(t => new Date(t.timestamp).getTime() >= cutoff)
      : allTrades;
    return makeStackedData(filtered, range);
  }, [allTrades, range]);

  const stackedSeries = [
    { name: 'TP3',          data: stackedData.tp3,   color: '#22c55e' },
    { name: 'Stop Loss',    data: stackedData.sl,    color: '#ef4444' },
    { name: 'Altri chiusi', data: stackedData.altri, color: '#6b7280' },
  ];

  // ── ApexCharts options: area ───────────────────────────────────────────────
  const areaOptions = useMemo<ApexCharts.ApexOptions>(() => {
    const cutoff   = getCutoff(range);
    const hasData  = areaSeries.some(s => s.data.length > 0);
    const xMin     = cutoff > 0 && hasData ? cutoff : undefined;
    const xFmt     = range === '1d' ? 'HH:mm' : 'dd MMM';

    return {
      chart: {
        type: 'area',
        background: 'transparent',
        toolbar: { show: true, tools: { download: false, selection: true, zoom: true, zoomin: true, zoomout: true, pan: true, reset: true } },
        zoom: { enabled: true, type: 'x' },
        animations: { enabled: false },
        fontFamily: 'inherit',
      },
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: [2, 2, 2, 2, 2, 2, 2] },
      fill: {
        type: 'gradient',
        gradient: { type: 'vertical', shadeIntensity: 0.3, opacityFrom: 0.25, opacityTo: 0.0, stops: [0, 90, 100] },
      },
      colors: SERIES_DEF.map(s => s.color),
      markers: { size: 0, hover: { size: 5 } },
      xaxis: {
        type: 'datetime',
        min: xMin,
        labels: { style: { colors: '#6b7280', fontSize: '11px' }, datetimeUTC: false, format: xFmt },
        axisBorder: { color: '#1f2937' },
        axisTicks: { color: '#1f2937' },
      },
      yaxis: {
        min: 0,
        labels: { style: { colors: '#6b7280', fontSize: '11px' }, formatter: (v) => Math.round(v).toString(), offsetX: -4 },
        title: { text: 'Totale cumulativo', style: { color: '#4b5563', fontSize: '11px', fontWeight: 400 } },
      },
      grid: { borderColor: '#1f2937', strokeDashArray: 4, xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } }, padding: { left: 4, right: 16 } },
      legend: { show: false },
      tooltip: {
        theme: 'dark',
        x: { format: range === '1d' ? 'dd MMM HH:mm' : 'dd MMM yyyy HH:mm' },
        y: { formatter: (val) => `${Math.round(val)} totali` },
        marker: { show: true },
        style: { fontSize: '12px' },
        shared: true,
        intersect: false,
      },
      theme: { mode: 'dark' },
    };
  }, [range, areaSeries]);

  // ── ApexCharts options: stacked 100% ──────────────────────────────────────
  const stackedOptions: ApexCharts.ApexOptions = {
    chart: {
      type: 'bar',
      stacked: true,
      stackType: '100%',
      background: 'transparent',
      toolbar: { show: false },
      animations: { enabled: false },
      fontFamily: 'inherit',
    },
    plotOptions: {
      bar: { horizontal: false, columnWidth: '70%', borderRadius: 2 },
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => val > 5 ? `${Math.round(val)}%` : '',
      style: { fontSize: '10px', fontWeight: 'bold', colors: ['#fff'] },
      dropShadow: { enabled: false },
    },
    colors: ['#22c55e', '#ef4444', '#6b7280'],
    xaxis: {
      categories: stackedData.categories.map(k => formatBucketLabel(k, range)),
      labels: {
        style: { colors: '#6b7280', fontSize: '10px' },
        rotate: -30,
        rotateAlways: stackedData.categories.length > 12,
      },
      axisBorder: { color: '#1f2937' },
      axisTicks: { color: '#1f2937' },
    },
    yaxis: {
      max: 100,
      labels: {
        style: { colors: '#6b7280', fontSize: '11px' },
        formatter: (v) => `${Math.round(v)}%`,
        offsetX: -4,
      },
      title: { text: '% trade chiusi', style: { color: '#4b5563', fontSize: '11px', fontWeight: 400 } },
    },
    grid: { borderColor: '#1f2937', strokeDashArray: 4, xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } }, padding: { left: 4, right: 16 } },
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'right',
      labels: { colors: '#9ca3af' },
      markers: { size: 8 },
      fontSize: '12px',
    },
    tooltip: {
      theme: 'dark',
      y: { formatter: (val, { seriesIndex, dataPointIndex, w }) => {
        const raw = w.config.series[seriesIndex].data[dataPointIndex];
        return `${raw} (${Math.round(val)}%)`;
      }},
      style: { fontSize: '12px' },
      shared: true,
      intersect: false,
    },
    theme: { mode: 'dark' },
  };

  const closedCount  = stackedData.tp3.reduce((a, b) => a + b, 0) +
                       stackedData.sl.reduce((a, b) => a + b, 0) +
                       stackedData.altri.reduce((a, b) => a + b, 0);

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-xl px-5 pt-4 pb-1 shadow-xl">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
        {/* Titolo + range */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-gray-200 tracking-wide uppercase">Andamento nel tempo</h3>
            {isLoading
              ? <span className="text-xs text-gray-500 animate-pulse">caricamento...</span>
              : <span className="text-xs text-gray-600">{allTrades.length} trade totali</span>
            }
          </div>
          <div className="flex gap-1 bg-gray-900 rounded-lg p-0.5 border border-gray-800">
            {RANGE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setRange(opt.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  range === opt.value
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Toggle tipo grafico */}
        <div className="flex gap-1 bg-gray-900 rounded-lg p-0.5 border border-gray-800">
          <button
            onClick={() => setChartMode('area')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              chartMode === 'area'
                ? 'bg-gray-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            title="Linea cumulativa"
          >
            Linea
          </button>
          <button
            onClick={() => setChartMode('stacked100')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              chartMode === 'stacked100'
                ? 'bg-gray-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            title="Stacked Column 100% — composizione chiusure"
          >
            Stacked 100%
          </button>
        </div>

        {/* Legenda cliccabile (solo area) */}
        {chartMode === 'area' && (
          <div className="flex flex-wrap gap-3">
            {SERIES_DEF.map(({ name, color }) => {
              const isHidden = hidden.has(name);
              return (
                <button
                  key={name}
                  onClick={() => toggleSeries(name)}
                  title={isHidden ? `Mostra ${name}` : `Nascondi ${name}`}
                  className={`flex items-center gap-1.5 text-xs transition-all rounded px-2 py-1 select-none ${
                    isHidden ? 'opacity-35 hover:opacity-60' : 'hover:brightness-110'
                  }`}
                  style={{ background: color + '18' }}
                >
                  <span className="inline-block w-3 h-3 rounded-full" style={{ background: isHidden ? '#4b5563' : color }} />
                  <span className="font-medium" style={{ color: isHidden ? '#6b7280' : color }}>{name}</span>
                  <span
                    className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: isHidden ? '#1f293780' : color + '28', color: isHidden ? '#4b5563' : color }}
                  >
                    {totals[name]}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Totali stacked (solo stacked100) */}
        {chartMode === 'stacked100' && (
          <div className="flex flex-wrap gap-3">
            {STACKED_DEF.map(({ name, color }) => {
              const count = name === 'TP3'
                ? stackedData.tp3.reduce((a, b) => a + b, 0)
                : name === 'Stop Loss'
                  ? stackedData.sl.reduce((a, b) => a + b, 0)
                  : stackedData.altri.reduce((a, b) => a + b, 0);
              const pct = closedCount > 0 ? ((count / closedCount) * 100).toFixed(1) : '0';
              return (
                <div
                  key={name}
                  className="flex items-center gap-1.5 text-xs rounded px-2 py-1"
                  style={{ background: color + '18' }}
                >
                  <span className="inline-block w-3 h-3 rounded-full" style={{ background: color }} />
                  <span className="font-medium" style={{ color }}>{name}</span>
                  <span className="font-bold px-1.5 py-0.5 rounded-full" style={{ background: color + '28', color }}>
                    {count} ({pct}%)
                  </span>
                </div>
              );
            })}
            {/* TP parziali hit */}
            {[
              { name: 'TP1 hit', color: '#3b82f6', count: allTrades.filter(t => t.tp1Hit).length },
              { name: 'TP2 hit', color: '#8b5cf6', count: allTrades.filter(t => t.tp2Hit).length },
            ].map(({ name, color, count }) => (
              <div key={name} className="flex items-center gap-1.5 text-xs rounded px-2 py-1" style={{ background: color + '18' }}>
                <span className="inline-block w-3 h-3 rounded-full" style={{ background: color }} />
                <span className="font-medium" style={{ color }}>{name}</span>
                <span className="font-bold px-1.5 py-0.5 rounded-full" style={{ background: color + '28', color }}>{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {chartMode === 'area' && areaSeries.every(s => s.data.length === 0) ? (
        <div className="flex items-center justify-center h-[300px] text-gray-500 text-sm">
          Nessun trade nel periodo selezionato
        </div>
      ) : chartMode === 'area' ? (
        <ApexChart
          key={`area-${range}`}
          type="area"
          series={areaSeries}
          options={areaOptions}
          height={300}
          width="100%"
        />
      ) : stackedData.categories.length === 0 ? (
        <div className="flex items-center justify-center h-[300px] text-gray-500 text-sm">
          Nessun trade chiuso nel periodo selezionato
        </div>
      ) : (
        <ApexChart
          key={`stacked-${range}`}
          type="bar"
          series={stackedSeries}
          options={stackedOptions}
          height={300}
          width="100%"
        />
      )}
    </div>
  );
};
