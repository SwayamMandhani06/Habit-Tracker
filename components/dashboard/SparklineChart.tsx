'use client'

// components/dashboard/SparklineChart.tsx — Lazy-loaded Recharts sparkline
import React from 'react'
import { BarChart, Bar, XAxis, ResponsiveContainer } from 'recharts'

export interface SparklineChartProps {
  data: Array<{ day: string; pct: number }>
}

export function SparklineChart({ data }: SparklineChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 6, left: 6, bottom: 0 }}>
        <XAxis
          dataKey="day"
          axisLine={false}
          tickLine={false}
          tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
        />
        <Bar
          dataKey="pct"
          fill="var(--accent)"
          radius={[2, 2, 0, 0]}
          maxBarSize={18}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

