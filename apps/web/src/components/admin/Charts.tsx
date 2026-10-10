'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export type DailyPoint = { date: string; users: number; posts: number; answers: number; logins: number };

const COLORS = { users: '#22c55e', posts: '#D4A017', answers: '#38bdf8', logins: '#a78bfa' };

export function ActivityChart({ data, height = 300 }: { data: DailyPoint[]; height?: number }) {
  const short = data.map((d) => ({ ...d, label: d.date.slice(5) }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={short} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          {(Object.keys(COLORS) as (keyof typeof COLORS)[]).map((k) => (
            <linearGradient key={k} id={`g-${k}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS[k]} stopOpacity={0.35} />
              <stop offset="100%" stopColor={COLORS[k]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16} />
        <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)' }}
          labelStyle={{ color: 'var(--text-secondary)' }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
        {(Object.keys(COLORS) as (keyof typeof COLORS)[]).map((k) => (
          <Area key={k} type="monotone" dataKey={k} name={k[0].toUpperCase() + k.slice(1)} stroke={COLORS[k]} strokeWidth={2} fill={`url(#g-${k})`} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function HorizontalBars({ data, color = '#22c55e' }: { data: { name: string; value: number }[]; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" width={120} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} tickLine={false} axisLine={false} />
        <Tooltip cursor={{ fill: 'var(--surface-2)' }} contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)' }} />
        <Bar dataKey="value" fill={color} radius={[0, 6, 6, 0]} barSize={14} />
      </BarChart>
    </ResponsiveContainer>
  );
}
