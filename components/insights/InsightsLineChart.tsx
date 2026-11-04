'use client'

// components/insights/InsightsLineChart.tsx — Lazy-loaded Recharts line chart
import React from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'

export interface InsightsLineChartProps {
  data: Array<{
    day: number
    date: string
    pct: number | null
    isToday: boolean
  }>
  monthName: string
}

const tooltipStyle = {
  backgroundColor: 'var(--surface-raised)',
  borderColor: 'var(--border)',
  borderRadius: '8px',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.75rem',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
  padding: '8px 12px',
}

export function InsightsLineChart({ data, monthName }: InsightsLineChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 12, right: 16, left: -22, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={{ stroke: 'var(--border)' }}
          tick={{ fontSize: 10, fontFamily: 'var(--font-mono)', fill: 'var(--text-muted)' }}
        />
        <YAxis
          domain={[0, 100]}
          unit="%"
          tickLine={false}
          axisLine={{ stroke: 'var(--border)' }}
          tick={{ fontSize: 10, fontFamily: 'var(--font-mono)', fill: 'var(--text-muted)' }}
          ticks={[0, 25, 50, 75, 100]}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(val: unknown) => [typeof val === 'number' ? `${val}%` : '—', 'Completion']}
          labelFormatter={(day: unknown) => `${monthName} ${day}`}
        />
        <ReferenceLine y={80} stroke="var(--accent)" strokeDasharray="4 4" strokeOpacity={0.7} />
        <Line
          type="monotone"
          dataKey="pct"
          stroke="var(--accent)"
          strokeWidth={2.5}
          dot={{ r: 2.5, fill: 'var(--accent)', strokeWidth: 0 }}
          activeDot={{ r: 5, fill: 'var(--accent)', stroke: 'var(--bg)', strokeWidth: 2 }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

