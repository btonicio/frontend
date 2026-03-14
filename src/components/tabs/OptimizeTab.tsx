// src/components/tabs/OptimizeTab.tsx

'use client';

import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { backtestApi } from '@/services/api';
import { OptimizationJob } from '@/types';
import { useAppStore } from '@/store/appStore';

type MetricType = 'profit' | 'sharpe' | 'winRate' | 'profitFactor';
type SortKey    = 'createdAt' | 'symbol' | 'status' | 'bestMetricValue' | 'totalTested';
type SortDir    = 'asc' | 'desc';

const ALL_METRICS: MetricType[] = ['profit', 'sharpe', 'winRate', 'profitFactor'];
const PAGE_SIZE = 20;

const METRIC_LABELS: Record<MetricType, string> = {
  profit:       'Net Profit %',
  sharpe:       'Sharpe Ratio',
  winRate:      'Win Rate',
  profitFactor: 'Profit Factor',
};

const METRIC_TOOLTIPS: Record<MetricType, string> = {
  profit:       'Rendimento composto percentuale sul capitale iniziale. Es: +25% su $10.000 → $12.500 finale.',
  sharpe:       'Rendimento / rischio (deviazione std dei trade). > 1.0 buono, > 1.5 ottimo, > 2.0 eccellente. Penalizza la volatilità dei trade.',
  winRate:      'Percentuale di trade chiusi in profitto. Un win rate alto ma con P&L asimmetrico può comunque essere unprofitable.',
  profitFactor: 'Gross Profit / Gross Loss. > 1.0 = sistema profittevole. > 1.5 buono. > 2.0 eccellente.',
};

// ─── Tooltip / InfoTip ────────────────────────────────────────────────────────
function InfoTip({ text }: { text: string }) {
  return (
    <span className="relative group inline-flex items-center cursor-help">
      <span className="ml-1 w-3.5 h-3.5 rounded-full bg-gray-700 text-gray-400 group-hover:bg-gray-600 group-hover:text-white text-[10px] flex items-center justify-center font-bold leading-none select-none">
        ?
      </span>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-56 px-2.5 py-1.5 bg-gray-900 text-gray-200 text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-gray-700 text-center leading-tight">
        {text}
      </span>
    </span>
  );
}

// ─── Job duration ─────────────────────────────────────────────────────────────
function JobDuration({ createdAt, updatedAt }: { createdAt: string; updatedAt: string }) {
  const ms  = new Date(updatedAt).getTime() - new Date(createdAt).getTime();
  const s   = Math.round(ms / 1000);
  const dur = s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
  return <span className="ml-1 text-gray-500">({dur})</span>;
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  if (status === 'RUNNING') return (
    <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs font-medium">
      <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
      Running
    </span>
  );
  if (status === 'COMPLETED') return (
    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs font-medium">✓ Completed</span>
  );
  return (
    <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs font-medium">✗ Failed</span>
  );
}

// ─── Inline results panel ─────────────────────────────────────────────────────
function InlineResults({ job, onClose }: { job: OptimizationJob; onClose: () => void }) {
  const [applyingRow, setApplyingRow] = useState<number | null>(null);
  const [appliedRow, setAppliedRow]   = useState<number | null>(null);

  const metricLabel   = METRIC_LABELS[job.metric as MetricType] ?? job.metric;
  const metricTooltip = METRIC_TOOLTIPS[job.metric as MetricType] ?? '';
  const topResults: any[] = job.topResults ?? [];

  const handleApplyRow = async (rank: number, params: any) => {
    setApplyingRow(rank);
    try {
      await backtestApi.applyCustomParams(job.symbol, params);
      setAppliedRow(rank);
    } catch (err) {
      console.error('Apply failed:', err);
    } finally {
      setApplyingRow(null);
    }
  };

  return (
    <div className="p-4 bg-dark-card/80 border-t border-dark-border space-y-4">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <p className="font-semibold text-white">
            📊 {job.symbol} — {new Date(job.startDate).toLocaleDateString()} → {new Date(job.endDate).toLocaleDateString()}
          </p>
          <p className="text-gray-400 text-xs mt-0.5">
            Metric: <span className="text-blue-400">{metricLabel}</span>
            <InfoTip text={metricTooltip} /> · {job.totalTested} combinations tested
          </p>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none ml-4">✕</button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-dark-border/30 rounded">
          <p className="text-gray-400 text-xs mb-1 flex items-center">Best {metricLabel} <InfoTip text={metricTooltip} /></p>
          <p className="text-xl font-bold text-green-400">{job.bestMetricValue?.toFixed(2)}</p>
        </div>
        <div className="p-3 bg-dark-border/30 rounded">
          <p className="text-gray-400 text-xs mb-1">Long / Short Threshold</p>
          <p className="text-xl font-bold">{job.bestParams?.longThreshold ?? '—'} / {job.bestParams?.shortThreshold ?? '—'}</p>
        </div>
        <div className="p-3 bg-dark-border/30 rounded">
          <p className="text-gray-400 text-xs mb-1">ATR Period / Mult</p>
          <p className="text-xl font-bold">{job.bestParams?.atrPeriod ?? 14} / {job.bestParams?.atrMultiplier ?? 1.5}</p>
        </div>
        <div className="p-3 bg-dark-border/30 rounded">
          <p className="text-gray-400 text-xs mb-1 flex items-center">Win Rate (best) <InfoTip text="% di trade chiusi in profitto." /></p>
          <p className="text-xl font-bold text-green-400">
            {topResults[0]?.winRate != null ? `${topResults[0].winRate.toFixed(1)}%` : '—'}
          </p>
        </div>
      </div>

      {/* Top 20 table */}
      {topResults.length > 0 && (
        <div className="overflow-x-auto">
          <p className="text-sm font-semibold mb-2">🏆 Top 20 — clicca Apply sulla riga che preferisci</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-dark-border text-gray-400">
                <th className="text-left py-1.5 px-2">Rank</th>
                <th className="text-right py-1.5 px-2">LT/ST</th>
                <th className="text-right py-1.5 px-2">RSI B/S</th>
                <th className="text-right py-1.5 px-2">Stoch OS/OB</th>
                <th className="text-right py-1.5 px-2">ATR P/M</th>
                <th className="text-right py-1.5 px-2">
                  <span className="flex items-center justify-end gap-0.5">Net Profit <InfoTip text="Somma aritmetica dei % P&L." /></span>
                </th>
                <th className="text-right py-1.5 px-2">
                  <span className="flex items-center justify-end gap-0.5">Profit % <InfoTip text="Rendimento composto sul capitale." /></span>
                </th>
                <th className="text-right py-1.5 px-2">
                  <span className="flex items-center justify-end gap-0.5">Sharpe <InfoTip text="Rendimento / deviazione std × √252." /></span>
                </th>
                <th className="text-right py-1.5 px-2">
                  <span className="flex items-center justify-end gap-0.5">Win % <InfoTip text="% trade chiusi in profitto." /></span>
                </th>
                <th className="text-right py-1.5 px-2">Trades</th>
                <th className="text-center py-1.5 px-2">Apply</th>
              </tr>
            </thead>
            <tbody>
              {topResults.map((res: any) => (
                <tr
                  key={res.rank}
                  className={`border-b border-dark-border/40 transition ${appliedRow === res.rank ? 'bg-green-900/20' : 'hover:bg-dark-border/30'}`}
                >
                  <td className="py-1.5 px-2">
                    <span className={`font-bold ${res.rank === 1 ? 'text-yellow-400' : res.rank === 2 ? 'text-gray-300' : res.rank === 3 ? 'text-orange-400' : 'text-gray-500'}`}>
                      #{res.rank}
                    </span>
                  </td>
                  <td className="text-right py-1.5 px-2 text-gray-300">{res.params?.longThreshold}/{res.params?.shortThreshold}</td>
                  <td className="text-right py-1.5 px-2 text-gray-300">{res.params?.rsiBuyLevel}/{res.params?.rsiSellLevel}</td>
                  <td className="text-right py-1.5 px-2 text-gray-300">{res.params?.stochOversold}/{res.params?.stochOverbought}</td>
                  <td className="text-right py-1.5 px-2 text-gray-300">{res.params?.atrPeriod ?? 14}/{res.params?.atrMultiplier ?? 1.5}</td>
                  <td className={`text-right py-1.5 px-2 font-semibold ${(res.netProfit ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${(res.netProfit ?? 0).toFixed(2)}
                  </td>
                  <td className={`text-right py-1.5 px-2 font-semibold ${(res.netProfitPercent ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {(res.netProfitPercent ?? 0).toFixed(2)}%
                  </td>
                  <td className="text-right py-1.5 px-2 text-blue-400">
                    {res.sharpeRatio != null ? res.sharpeRatio.toFixed(2) : '—'}
                  </td>
                  <td className="text-right py-1.5 px-2 text-gray-300">{(res.winRate ?? 0).toFixed(1)}%</td>
                  <td className="text-right py-1.5 px-2 text-gray-400">{res.totalTrades ?? 0}</td>
                  <td className="text-center py-1.5 px-2">
                    {appliedRow === res.rank ? (
                      <span className="text-green-400 text-xs font-semibold">✓</span>
                    ) : (
                      <button
                        onClick={() => handleApplyRow(res.rank, res.params)}
                        disabled={applyingRow !== null}
                        className="px-2 py-0.5 bg-green-700 hover:bg-green-600 text-white text-xs rounded transition disabled:opacity-50"
                      >
                        {applyingRow === res.rank ? '…' : 'Apply'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-500 mt-2">
            "Apply" salva i parametri su <strong>{job.symbol}</strong> — il job non viene modificato.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Recommendation row ───────────────────────────────────────────────────────
function RecommendRow({ candidate: c, symbol }: { candidate: any; symbol: string }) {
  const [applying, setApplying] = useState(false);
  const [applied,  setApplied]  = useState(false);

  const handleApply = async () => {
    setApplying(true);
    try {
      await backtestApi.applyCustomParams(symbol, c.params);
      setApplied(true);
    } catch (err) {
      console.error('Apply failed:', err);
    } finally {
      setApplying(false);
    }
  };

  return (
    <tr className={`border-b border-dark-border/40 transition ${applied ? 'bg-green-900/20' : 'hover:bg-dark-border/30'}`}>
      <td className="py-1.5 px-2">
        <span className={`font-bold ${c.rank === 1 ? 'text-yellow-400' : c.rank === 2 ? 'text-gray-300' : c.rank === 3 ? 'text-orange-400' : 'text-gray-500'}`}>
          #{c.rank}
        </span>
      </td>
      <td className="text-right py-1.5 px-2 text-purple-400 font-semibold">
        {(c.compositeScore * 100).toFixed(1)}
      </td>
      <td className="text-right py-1.5 px-2 text-gray-300">{c.params?.longThreshold}/{c.params?.shortThreshold}</td>
      <td className="text-right py-1.5 px-2 text-gray-300">{c.params?.atrPeriod ?? 14}/{c.params?.atrMultiplier ?? 1.5}</td>
      <td className={`text-right py-1.5 px-2 font-semibold ${(c.netProfitPercent ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {(c.netProfitPercent ?? 0).toFixed(2)}%
      </td>
      <td className="text-right py-1.5 px-2 text-blue-400">{c.sharpeRatio != null ? c.sharpeRatio.toFixed(2) : '—'}</td>
      <td className="text-right py-1.5 px-2 text-gray-300">{(c.winRate ?? 0).toFixed(1)}%</td>
      <td className="text-right py-1.5 px-2 text-gray-300">{c.profitFactor != null ? c.profitFactor.toFixed(2) : '—'}</td>
      <td className="text-right py-1.5 px-2 text-red-400">{(c.maxDrawdown ?? 0).toFixed(1)}%</td>
      <td className="text-right py-1.5 px-2 text-gray-400">{c.totalTrades ?? 0}</td>
      <td className="text-center py-1.5 px-2">
        {applied ? (
          <span className="text-green-400 font-semibold">✓</span>
        ) : (
          <button
            onClick={handleApply}
            disabled={applying}
            className="px-2 py-0.5 bg-purple-700 hover:bg-purple-600 text-white text-xs rounded transition disabled:opacity-50"
          >
            {applying ? '…' : 'Apply'}
          </button>
        )}
      </td>
    </tr>
  );
}

// ─── Sortable header cell ─────────────────────────────────────────────────────
function SortTh({
  label, sortKey, current, dir, onSort, className = '',
}: {
  label: React.ReactNode;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const active = current === sortKey;
  return (
    <th
      className={`py-2 px-2 cursor-pointer select-none hover:text-white transition ${active ? 'text-white' : 'text-gray-400'} ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <span className="flex items-center gap-1">
        {label}
        <span className="text-[10px]">{active ? (dir === 'asc' ? '▲' : '▼') : '⇅'}</span>
      </span>
    </th>
  );
}

// ─── Full Sweep history row ───────────────────────────────────────────────────
function FullSweepRow({
  sweep,
  isActive,
  onSelect,
  onRecompute,
}: {
  sweep: any;
  isActive: boolean;
  onSelect: () => void;
  onRecompute: (id: number) => void;
}) {
  const rec = sweep.recommendation as any | null;
  const statusColor =
    sweep.status === 'RUNNING'   ? 'text-yellow-400' :
    sweep.status === 'COMPLETED' ? 'text-green-400'  :
    sweep.status === 'PARTIAL'   ? 'text-blue-400'   : 'text-red-400';

  return (
    <>
      <tr
        className={`border-b border-dark-border/40 cursor-pointer transition ${isActive ? 'bg-purple-900/20' : 'hover:bg-dark-border/20'}`}
        onClick={onSelect}
      >
        <td className="py-2 px-2 text-gray-500 text-xs">#{sweep.id}</td>
        <td className="py-2 px-2 font-medium">{sweep.symbol}</td>
        <td className="py-2 px-2 text-gray-400 text-xs whitespace-nowrap">
          {new Date(sweep.startDate).toLocaleDateString()} → {new Date(sweep.endDate).toLocaleDateString()}
        </td>
        <td className="py-2 px-2 text-gray-400 text-xs text-center">{sweep.maxCombinations}</td>
        <td className="py-2 px-2">
          <span className={`text-xs font-semibold ${statusColor} flex items-center gap-1`}>
            {sweep.status === 'RUNNING' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />}
            {sweep.status}
          </span>
        </td>
        <td className="py-2 px-2">
          <div className="flex gap-1">
            {ALL_METRICS.map((m, i) => {
              const job = sweep.jobs?.find((j: any) => j.metric === m) ?? sweep.jobs?.[i];
              const color =
                !job                       ? 'bg-gray-600' :
                job.status === 'RUNNING'   ? 'bg-yellow-400 animate-pulse' :
                job.status === 'COMPLETED' ? 'bg-green-400' : 'bg-red-400';
              return (
                <span key={m} title={METRIC_LABELS[m]} className={`inline-block w-2 h-2 rounded-full ${color}`} />
              );
            })}
          </div>
        </td>
        <td className="py-2 px-2 text-gray-500 text-xs">{new Date(sweep.createdAt).toLocaleString()}</td>
        <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
          <div className="flex gap-1 justify-center">
            {sweep.status !== 'RUNNING' && (
              <button
                onClick={() => onRecompute(sweep.id)}
                className="px-2 py-0.5 bg-purple-800 hover:bg-purple-700 text-white text-xs rounded transition"
                title="Ricalcola recommendation"
              >
                ↺
              </button>
            )}
            <span className="text-gray-500 text-xs self-center">
              {rec ? '✓ rec' : '—'}
            </span>
          </div>
        </td>
      </tr>
      {isActive && rec && (
        <tr className="border-b border-dark-border/40">
          <td colSpan={8} className="p-4 bg-purple-900/10">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-white">
                🏆 Raccomandazione — {rec.symbol} · {rec.totalCandidates} candidati · {rec.completedJobs}/{rec.totalJobs} job
              </p>
              <p className="text-xs text-gray-500">Score composito: Profit 30% + Sharpe 30% + WinRate 20% + ProfitFactor 20%</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-dark-border text-gray-400">
                      <th className="text-left py-1 px-2">Rank</th>
                      <th className="text-right py-1 px-2">Score</th>
                      <th className="text-right py-1 px-2">LT/ST</th>
                      <th className="text-right py-1 px-2">ATR P/M</th>
                      <th className="text-right py-1 px-2">Net Profit %</th>
                      <th className="text-right py-1 px-2">Sharpe</th>
                      <th className="text-right py-1 px-2">Win %</th>
                      <th className="text-right py-1 px-2">PF</th>
                      <th className="text-right py-1 px-2">DD</th>
                      <th className="text-right py-1 px-2">Trades</th>
                      <th className="text-center py-1 px-2">Apply</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(rec.top5 ?? []).map((c: any, i: number) => (
                      <RecommendRow key={i} candidate={c} symbol={rec.symbol} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </td>
        </tr>
      )}
      {isActive && !rec && sweep.status !== 'RUNNING' && (
        <tr className="border-b border-dark-border/40">
          <td colSpan={8} className="py-3 px-4 text-sm text-gray-400 bg-purple-900/10">
            Nessuna recommendation ancora. Clicca ↺ per calcolarla.
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export const OptimizeTab: React.FC = () => {
  const [symbol, setSymbol]               = useState('BTC/USDT');
  const [startDate, setStartDate]         = useState('2024-01-01');
  const [endDate, setEndDate]             = useState(new Date().toISOString().split('T')[0]);
  const [metric, setMetric]               = useState<MetricType>('sharpe');
  const [maxCombinations, setMaxCombinations] = useState(144);
  const [submitting, setSubmitting]       = useState(false);
  const [submitError, setSubmitError]     = useState<string | null>(null);

  // Full Sweep state — sweepJobIds e recommendation persistiti su localStorage
  // per sopravvivere ai cambi di pagina/tab
  const [sweepMaxCombinations, setSweepMaxCombinations] = useState(1440);
  const [sweepSubmitting, setSweepSubmitting]           = useState(false);
  const [sweepJobIds, setSweepJobIdsRaw] = useState<number[] | null>(() => {
    try {
      const saved = localStorage.getItem('saturia_sweep_jobIds');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const setSweepJobIds = (ids: number[] | null) => {
    setSweepJobIdsRaw(ids);
    if (ids === null) localStorage.removeItem('saturia_sweep_jobIds');
    else localStorage.setItem('saturia_sweep_jobIds', JSON.stringify(ids));
  };
  const [sweepId, setSweepIdRaw] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem('saturia_sweep_id');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const setSweepId = (id: number | null) => {
    setSweepIdRaw(id);
    if (id === null) localStorage.removeItem('saturia_sweep_id');
    else localStorage.setItem('saturia_sweep_id', JSON.stringify(id));
  };
  const [sweepError, setSweepError]                     = useState<string | null>(null);
  const [recommendation, setRecommendationRaw] = useState<any | null>(() => {
    try {
      const saved = localStorage.getItem('saturia_sweep_recommendation');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const setRecommendation = (rec: any | null) => {
    setRecommendationRaw(rec);
    if (rec === null) localStorage.removeItem('saturia_sweep_recommendation');
    else localStorage.setItem('saturia_sweep_recommendation', JSON.stringify(rec));
  };
  const [recommending, setRecommending]                 = useState(false);

  // Full Sweep history state
  const [selectedSweepId, setSelectedSweepId] = useState<number | null>(null);
  const [recomputingSweepId, setRecomputingSweepId] = useState<number | null>(null);

  // jobs table state
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [filterSymbol, setFilterSymbol]   = useState('');
  const [filterMetric, setFilterMetric]   = useState<string>('');
  const [sortKey, setSortKey]             = useState<SortKey>('createdAt');
  const [sortDir, setSortDir]             = useState<SortDir>('desc');
  const [page, setPage]                   = useState(1);

  const lastOptimizationEvent = useAppStore((s) => s.lastOptimizationEvent);

  const { data: assetsData, isLoading: assetsLoading } = useSWR(
    '/backtest/assets',
    () => backtestApi.getAssets(),
  );
  const symbols = assetsData?.assets ?? [];

  const { data: fullSweeps, error: fullSweepsError, mutate: refreshFullSweeps } = useSWR<any[]>(
    '/backtest/full-sweeps',
    () => backtestApi.getFullSweeps(),
    {
      fallbackData: [],
      refreshInterval: (data) => {
        if (!data) return 5000;
        return data.some((s) => s.status === 'RUNNING') ? 5000 : 0;
      },
    },
  );
  const sweeps = fullSweeps ?? [];

  const { data: jobs, mutate: refreshJobs } = useSWR<OptimizationJob[]>(
    '/optimize/history',
    () => backtestApi.getOptimizationHistory({ limit: 100 }) as Promise<OptimizationJob[]>,
    {
      refreshInterval: (data) => {
        if (!data) return 3000;
        return data.some((j) => j.status === 'RUNNING') ? 3000 : 0;
      },
    },
  );

  useEffect(() => {
    if (lastOptimizationEvent) { refreshJobs(); refreshFullSweeps(); }
  }, [lastOptimizationEvent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      await backtestApi.optimize({ symbol, startDate, endDate, metric, maxCombinations });
      await refreshJobs();
      setSelectedJobId(null);
      setPage(1);
      setTimeout(() => document.getElementById('jobs-list')?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err: any) {
      setSubmitError(err.response?.data?.message || err.message || 'Failed to queue optimization');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(1);
  };

  // Full Sweep handlers
  const handleFullSweep = async () => {
    setSweepSubmitting(true);
    setSweepError(null);
    setRecommendation(null);
    setSweepJobIds(null);
    setSweepId(null);
    try {
      const res = await backtestApi.optimizeFull({ symbol, startDate, endDate, maxCombinations: sweepMaxCombinations });
      setSweepJobIds(res.jobIds);
      setSweepId(res.sweepId);
      await refreshJobs();
      await refreshFullSweeps();
      setPage(1);
      setTimeout(() => document.getElementById('jobs-list')?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err: any) {
      setSweepError(err.response?.data?.message || err.message || 'Failed to start full sweep');
    } finally {
      setSweepSubmitting(false);
    }
  };

  const handleRecommend = async () => {
    if (!sweepJobIds) return;
    setRecommending(true);
    try {
      const res = sweepId
        ? await backtestApi.recommendForSweep(sweepId)
        : await backtestApi.recommend(sweepJobIds);
      setRecommendation(res);
      await refreshFullSweeps();
    } catch (err: any) {
      setSweepError(err.response?.data?.message || err.message || 'Failed to get recommendation');
    } finally {
      setRecommending(false);
    }
  };

  const handleRecomputeSweep = async (id: number) => {
    setRecomputingSweepId(id);
    try {
      await backtestApi.recommendForSweep(id);
      await refreshFullSweeps();
      setSelectedSweepId(id);
    } catch (err: any) {
      console.error('Recompute failed:', err);
    } finally {
      setRecomputingSweepId(null);
    }
  };

  // Auto-recommend when all sweep jobs complete
  useEffect(() => {
    if (!sweepJobIds || !jobs || recommendation) return;
    const sweepJobs = jobs.filter((j) => sweepJobIds.includes(j.id));
    const allDone = sweepJobs.length === sweepJobIds.length &&
      sweepJobs.every((j) => j.status === 'COMPLETED' || j.status === 'FAILED');
    const anyCompleted = sweepJobs.some((j) => j.status === 'COMPLETED');
    if (allDone && anyCompleted) {
      handleRecommend();
    }
  }, [jobs, sweepJobIds]);

  // filter → sort → paginate
  const allJobs = jobs ?? [];
  const filtered = allJobs
    .filter((j) => !filterSymbol || j.symbol.toLowerCase().includes(filterSymbol.toLowerCase()))
    .filter((j) => !filterMetric  || j.metric === filterMetric);

  const sorted = [...filtered].sort((a, b) => {
    let av: any, bv: any;
    if (sortKey === 'createdAt')       { av = a.createdAt; bv = b.createdAt; }
    else if (sortKey === 'symbol')     { av = a.symbol; bv = b.symbol; }
    else if (sortKey === 'status')     { av = a.status; bv = b.status; }
    else if (sortKey === 'bestMetricValue') { av = a.bestMetricValue ?? -Infinity; bv = b.bestMetricValue ?? -Infinity; }
    else if (sortKey === 'totalTested')    { av = a.totalTested ?? 0; bv = b.totalTested ?? 0; }
    else { av = a.createdAt; bv = b.createdAt; }
    if (av < bv) return sortDir === 'asc' ? -1 :  1;
    if (av > bv) return sortDir === 'asc' ?  1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasRunning = allJobs.some((j) => j.status === 'RUNNING');

  const COL_COUNT = 9;

  return (
    <div className="max-w-7xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">🔍 Parameter Optimization</h2>
        <p className="text-gray-400 text-sm mt-1">
          I job vengono eseguiti in background — puoi chiudere la pagina e tornare dopo.
        </p>
      </div>

      {/* Submit form */}
      <form onSubmit={handleSubmit} className="card">
        <h3 className="text-lg font-semibold mb-4">🚀 Nuovo job</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">Symbol</label>
            <select
              value={symbol} onChange={(e) => setSymbol(e.target.value)}
              disabled={assetsLoading || submitting}
              className="w-full bg-dark-border text-white px-3 py-2 rounded border border-dark-border focus:border-blue-500 outline-none transition disabled:opacity-50"
            >
              {assetsLoading ? <option>Loading...</option> : symbols.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              disabled={submitting}
              className="w-full bg-dark-border text-white px-3 py-2 rounded border border-dark-border focus:border-blue-500 outline-none transition disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              disabled={submitting}
              className="w-full bg-dark-border text-white px-3 py-2 rounded border border-dark-border focus:border-blue-500 outline-none transition disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1 flex items-center gap-1">
              Optimization Metric
              <InfoTip text={METRIC_TOOLTIPS[metric]} />
            </label>
            <select value={metric} onChange={(e) => setMetric(e.target.value as MetricType)}
              disabled={submitting}
              className="w-full bg-dark-border text-white px-3 py-2 rounded border border-dark-border focus:border-blue-500 outline-none transition disabled:opacity-50"
            >
              <option value="sharpe">Sharpe Ratio — rendimento / rischio</option>
              <option value="profit">Net Profit % — rendimento composto</option>
              <option value="winRate">Win Rate — % trade vincenti</option>
              <option value="profitFactor">Profit Factor — profitti / perdite</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1 flex items-center gap-1">
              Max Combinations
              <InfoTip text="Unità base = 144 (12 preset pesi × 3 ATR period × 4 ATR mult). Consigliato: 144 o 288. Max: ~8.640." />
            </label>
            <input type="number" value={maxCombinations} onChange={(e) => setMaxCombinations(Number(e.target.value))}
              disabled={submitting} min="144" max="8640" step="144"
              className="w-full bg-dark-border text-white px-3 py-2 rounded border border-dark-border focus:border-blue-500 outline-none transition disabled:opacity-50"
            />
          </div>

          <div className="flex items-end">
            <button type="submit" disabled={submitting || assetsLoading}
              className="w-full px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? '⏳ Queuing...' : '🚀 Start Optimization'}
            </button>
          </div>
        </div>
        {submitError && <p className="mt-3 text-red-400 text-sm">❌ {submitError}</p>}
      </form>

      {/* Full Sweep */}
      <div className="card border border-purple-500/20 bg-purple-900/5">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold">🎯 Full Sweep</h3>
            <p className="text-gray-400 text-xs mt-0.5">
              Avvia automaticamente 4 job (uno per ogni metric) sul simbolo e periodo selezionati, poi calcola la migliore combinazione con score composito.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div>
              <label className="block text-gray-400 text-xs mb-1 flex items-center gap-1">
                Max Combos/metric <InfoTip text="Combinazioni per ciascuno dei 4 job. 1440 = run completo (~25 min totali)." />
              </label>
              <input
                type="number"
                value={sweepMaxCombinations}
                onChange={(e) => setSweepMaxCombinations(Number(e.target.value))}
                disabled={sweepSubmitting}
                min="144" max="8640" step="144"
                className="w-28 bg-dark-border text-white text-sm px-3 py-1.5 rounded border border-dark-border focus:border-purple-500 outline-none transition disabled:opacity-50"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleFullSweep}
                disabled={sweepSubmitting || submitting}
                className="px-5 py-2 bg-purple-700 hover:bg-purple-600 text-white font-semibold rounded transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {sweepSubmitting ? '⏳ Avvio…' : '🎯 Start Full Sweep'}
              </button>
            </div>
          </div>
        </div>

        {sweepError && <p className="text-red-400 text-sm mb-3">❌ {sweepError}</p>}

        {/* Progress: one dot per metric job */}
        {sweepJobIds && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
              {ALL_METRICS.map((m, i) => {
                const jobId = sweepJobIds[i];
                const job   = jobs?.find((j) => j.id === jobId);
                return (
                  <div key={m} className="flex items-center gap-2 px-3 py-1.5 bg-dark-border/40 rounded text-sm">
                    <span className={`w-2 h-2 rounded-full ${
                      !job ? 'bg-gray-600' :
                      job.status === 'RUNNING'   ? 'bg-yellow-400 animate-pulse' :
                      job.status === 'COMPLETED' ? 'bg-green-400' : 'bg-red-400'
                    }`} />
                    <span className="text-gray-300">{METRIC_LABELS[m]}</span>
                    <span className="text-gray-500 text-xs">#{jobId}</span>
                    {job?.status === 'COMPLETED' && (
                      <span className="text-green-400 text-xs font-semibold">
                        {job.bestMetricValue?.toFixed(2)}{m === 'winRate' ? '%' : ''}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Recommendation */}
            {recommending && (
              <p className="text-purple-400 text-sm animate-pulse">🧠 Calcolo raccomandazione…</p>
            )}

            {recommendation && (
              <div className="mt-2 space-y-3">
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold text-white">
                    🏆 Raccomandazione — {recommendation.symbol}
                  </p>
                  <span className="text-xs text-gray-400">
                    {recommendation.totalCandidates} candidati unici · {recommendation.completedJobs}/{recommendation.totalJobs} job completati
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Score composito: Profit 30% + Sharpe 30% + WinRate 20% + ProfitFactor 20%
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-dark-border text-gray-400">
                        <th className="text-left py-1.5 px-2">Rank</th>
                        <th className="text-right py-1.5 px-2">Score</th>
                        <th className="text-right py-1.5 px-2">LT/ST</th>
                        <th className="text-right py-1.5 px-2">ATR P/M</th>
                        <th className="text-right py-1.5 px-2">Net Profit %</th>
                        <th className="text-right py-1.5 px-2">Sharpe</th>
                        <th className="text-right py-1.5 px-2">Win %</th>
                        <th className="text-right py-1.5 px-2">PF</th>
                        <th className="text-right py-1.5 px-2">DD</th>
                        <th className="text-right py-1.5 px-2">Trades</th>
                        <th className="text-center py-1.5 px-2">Apply</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recommendation.top5.map((c: any, i: number) => (
                        <RecommendRow
                          key={i}
                          candidate={c}
                          symbol={recommendation.symbol}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full Sweep History */}
      <div className="card border border-purple-500/10">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-semibold">📚 Full Sweep History</h3>
          {sweeps.some((s) => s.status === 'RUNNING') && (
            <span className="text-xs font-normal text-yellow-400 animate-pulse">● live</span>
          )}
          {sweeps.length > 0 && (
            <span className="text-xs text-gray-500">{sweeps.length} sweep</span>
          )}
        </div>
        {fullSweepsError ? (
          <p className="text-red-400 text-sm">Errore caricamento: {fullSweepsError.message}</p>
        ) : sweeps.length === 0 ? (
          <p className="text-gray-500 text-sm">Nessun Full Sweep ancora. Avvia il primo con il tasto "Start Full Sweep".</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-border text-gray-400 text-xs">
                  <th className="text-left py-2 px-2">ID</th>
                  <th className="text-left py-2 px-2">Symbol</th>
                  <th className="text-left py-2 px-2">Periodo</th>
                  <th className="text-center py-2 px-2">Combos</th>
                  <th className="text-left py-2 px-2">Status</th>
                  <th className="text-left py-2 px-2">Jobs</th>
                  <th className="text-left py-2 px-2">Avviato</th>
                  <th className="text-center py-2 px-2">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {sweeps.map((sweep) => (
                  <FullSweepRow
                    key={sweep.id}
                    sweep={recomputingSweepId === sweep.id ? { ...sweep, status: 'RUNNING' } : sweep}
                    isActive={selectedSweepId === sweep.id}
                    onSelect={() => setSelectedSweepId(selectedSweepId === sweep.id ? null : sweep.id)}
                    onRecompute={handleRecomputeSweep}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Jobs list */}
      <div id="jobs-list" className="card">
        {/* Table header bar */}
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">📋 Optimization Jobs</h3>
            {hasRunning && (
              <span className="text-xs font-normal text-yellow-400 animate-pulse">● live</span>
            )}
            {filtered.length > 0 && (
              <span className="text-xs text-gray-500">{filtered.length} job{filtered.length !== 1 ? 's' : ''}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Filtra asset…"
              value={filterSymbol}
              onChange={(e) => { setFilterSymbol(e.target.value); setPage(1); setSelectedJobId(null); }}
              className="bg-dark-border text-white text-sm px-3 py-1.5 rounded border border-dark-border focus:border-blue-500 outline-none transition w-36"
            />
            <select
              value={filterMetric}
              onChange={(e) => { setFilterMetric(e.target.value); setPage(1); setSelectedJobId(null); }}
              className="bg-dark-border text-white text-sm px-3 py-1.5 rounded border border-dark-border focus:border-blue-500 outline-none transition"
            >
              <option value="">Tutte le metric</option>
              {(Object.entries(METRIC_LABELS) as [MetricType, string][]).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <button onClick={() => refreshJobs()} className="text-sm text-gray-400 hover:text-white transition">
              ↻ Refresh
            </button>
          </div>
        </div>

        {allJobs.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nessun job ancora. Avvia una prima ottimizzazione.</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nessun job trovato per i filtri selezionati.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-border">
                    <th className="text-left py-2 px-2 text-gray-400">ID</th>
                    <SortTh label="Status"     sortKey="status"          current={sortKey} dir={sortDir} onSort={handleSort} className="text-left" />
                    <SortTh label="Symbol"     sortKey="symbol"          current={sortKey} dir={sortDir} onSort={handleSort} className="text-left" />
                    <th className="text-left py-2 px-2 text-gray-400">Period</th>
                    <th className="text-left py-2 px-2 text-gray-400">Metric</th>
                    <SortTh
                      label={<span className="flex items-center gap-0.5">Combos <InfoTip text="Numero di combinazioni testate." /></span>}
                      sortKey="totalTested" current={sortKey} dir={sortDir} onSort={handleSort} className="text-right"
                    />
                    <SortTh label="Best Value" sortKey="bestMetricValue" current={sortKey} dir={sortDir} onSort={handleSort} className="text-right" />
                    <SortTh label="Started"    sortKey="createdAt"       current={sortKey} dir={sortDir} onSort={handleSort} className="text-right" />
                    <th className="text-center py-2 px-2 text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((job) => (
                    <React.Fragment key={job.id}>
                      <tr
                        className={`border-b border-dark-border/40 transition
                          ${job.status === 'COMPLETED' ? 'cursor-pointer hover:bg-dark-border/30' : ''}
                          ${selectedJobId === job.id ? 'bg-dark-border/50' : ''}`}
                        onClick={() => job.status === 'COMPLETED' && setSelectedJobId(selectedJobId === job.id ? null : job.id)}
                      >
                        <td className="py-3 px-2 text-gray-500 text-xs font-mono">#{job.id}</td>
                        <td className="py-3 px-2"><StatusBadge status={job.status} /></td>
                        <td className="py-3 px-2 font-semibold">{job.symbol}</td>
                        <td className="py-3 px-2 text-gray-400 text-xs">
                          {new Date(job.startDate).toLocaleDateString()} – {new Date(job.endDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-2">
                          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                            {METRIC_LABELS[job.metric as MetricType] ?? job.metric}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right text-gray-400">
                          {job.status === 'COMPLETED' ? job.totalTested : job.paramRanges?.combinations ?? '—'}
                        </td>
                        <td className="py-3 px-2 text-right">
                          {job.status === 'COMPLETED' ? (
                            <span className={job.bestMetricValue >= 0 ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                              {job.bestMetricValue.toFixed(2)}{job.metric === 'winRate' ? '%' : ''}
                            </span>
                          ) : job.status === 'FAILED' ? (
                            <span className="text-red-400 text-xs" title={job.errorMessage ?? ''}>error</span>
                          ) : (
                            <span className="text-yellow-400 text-xs">computing…</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right text-gray-400 text-xs">
                          {new Date(job.createdAt).toLocaleTimeString()}
                          {job.status !== 'RUNNING' && job.updatedAt && (
                            <JobDuration createdAt={job.createdAt} updatedAt={job.updatedAt} />
                          )}
                        </td>
                        <td className="py-3 px-2 text-center">
                          {job.status === 'COMPLETED' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedJobId(selectedJobId === job.id ? null : job.id); }}
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded transition"
                            >
                              {selectedJobId === job.id ? 'Hide ▲' : 'View ▼'}
                            </button>
                          )}
                          {job.status === 'FAILED' && (
                            <span className="text-red-400 text-xs" title={job.errorMessage ?? ''}>
                              ⚠ {job.errorMessage?.slice(0, 30) ?? 'error'}
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* Inline expanded detail */}
                      {selectedJobId === job.id && (
                        <tr>
                          <td colSpan={COL_COUNT} className="p-0">
                            <InlineResults job={job} onClose={() => setSelectedJobId(null)} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 text-sm">
                <span className="text-gray-500">
                  Pagina {page} di {totalPages} · {filtered.length} job
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(1)} disabled={page === 1}
                    className="px-2 py-1 rounded text-gray-400 hover:text-white disabled:opacity-30 transition"
                  >«</button>
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-2 py-1 rounded text-gray-400 hover:text-white disabled:opacity-30 transition"
                  >‹</button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const p = Math.min(Math.max(page - 2, 1) + i, totalPages);
                    return (
                      <button
                        key={p} onClick={() => setPage(p)}
                        className={`px-2 py-1 rounded transition ${p === page ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                      >{p}</button>
                    );
                  })}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="px-2 py-1 rounded text-gray-400 hover:text-white disabled:opacity-30 transition"
                  >›</button>
                  <button
                    onClick={() => setPage(totalPages)} disabled={page === totalPages}
                    className="px-2 py-1 rounded text-gray-400 hover:text-white disabled:opacity-30 transition"
                  >»</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
