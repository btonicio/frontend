'use client';

import React from 'react';
import useSWR from 'swr';

interface FearGreedData {
  value: number;
  classification: string;
  timestamp: string;
  updatedAt: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// In SVG (y-axis down), sweep=1 means increasing θ.
// Going from 180° to 360° with increasing θ passes through 270° = the TOP of the arc.
// So sweep=1 draws the UPPER semicircle — correct for a gauge.
function ArcGauge({ value }: { value: number }) {
  const cx = 60;
  const cy = 58;
  const r  = 44;
  const strokeW = 3;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const ptX   = (deg: number) => cx + r * Math.cos(toRad(deg));
  const ptY   = (deg: number) => cy + r * Math.sin(toRad(deg));

  const arcPath = (fromDeg: number, toDeg: number) => {
    const x1 = ptX(fromDeg), y1 = ptY(fromDeg);
    const x2 = ptX(toDeg),   y2 = ptY(toDeg);
    const largeArc = toDeg - fromDeg > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  const START   = 180;
  const END     = 360;
  const fillEnd = START + (value / 100) * (END - START);

  // Needle: shorter than the arc radius so it doesn't reach the track
  const needleLen = r - 16;
  const nx = cx + needleLen * Math.cos(toRad(fillEnd));
  const ny = cy + needleLen * Math.sin(toRad(fillEnd));

  return (
    <svg width="120" height="74" viewBox="0 0 120 74">
      <defs>
        {/* gradient spans the horizontal extent of the arc */}
        <linearGradient id="fng-grad" gradientUnits="userSpaceOnUse"
                        x1={ptX(START)} y1={cy} x2={ptX(END)} y2={cy}>
          <stop offset="0%"   stopColor="#ef4444" />
          <stop offset="25%"  stopColor="#f97316" />
          <stop offset="50%"  stopColor="#eab308" />
          <stop offset="75%"  stopColor="#84cc16" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
      </defs>

      {/* Grey track — full semicircle */}
      <path d={arcPath(START, END)}
            fill="none" stroke="#374151"
            strokeWidth={strokeW} strokeLinecap="round" />

      {/* Coloured filled portion */}
      {value > 0 && (
        <path d={value >= 100 ? arcPath(START, END) : arcPath(START, fillEnd)}
              fill="none" stroke="url(#fng-grad)"
              strokeWidth={strokeW} strokeLinecap="round" />
      )}

      {/* Needle */}
      <line x1={cx} y1={cy} x2={nx} y2={ny}
            stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="2.5" fill="#d1d5db" />

      {/* Value label — below the pivot */}
      <text x={cx} y={cy + 13}
            textAnchor="middle" fontSize="12" fontWeight="bold" fill="#ffffff">
        {value}
      </text>
    </svg>
  );
}

export const FearGreedGauge: React.FC = () => {
  const { data, error, isLoading } = useSWR<FearGreedData>(
    `${API_URL}/fng`,
    fetcher,
    { refreshInterval: 15 * 60 * 1000 },
  );

  if (isLoading || error || !data) {
    return (
      <div className="flex flex-col items-center justify-center w-28 opacity-40">
        <div className="text-xs text-gray-500 mb-1">Fear &amp; Greed</div>
        <div className="text-xs text-gray-600">—</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="text-xs text-gray-400 mb-0.5">Fear &amp; Greed</div>
      <ArcGauge value={data.value} />
      <div className="text-xs text-gray-300 -mt-2 font-medium">{data.classification}</div>
    </div>
  );
};
