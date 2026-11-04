'use client'

// components/habit-detail/HabitDetailCharts.tsx — Lazy-loaded Recharts charts for habit details
import React from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
} from 'recharts'

export interface HabitDetailChartsProps {
  isAmountHabit: boolean
  habitUnit?: string | null
  targetVal?: number | null
  resolvedColor: string
  dailyAmountData: any[]
  weeklyData: any[]
  weekdayData: {
    weekdays: any[]
    weakestWeekday?: { dayLabel: string; rate: number } | null
  }
  monthlyData: any[]
  calYear: number
}

export function HabitDetailCharts({
  isAmountHabit,
  habitUnit,
  targetVal,
  resolvedColor,
  dailyAmountData,
  weeklyData,
  weekdayData,
  monthlyData,
  calYear,
}: HabitDetailChartsProps) {
  return (
    <>
      {/* Velocity / Amount Chart */}
      <div className="p-5 sm:p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="font-mono text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] block">
              {isAmountHabit ? 'DAILY AMOUNT TRACKING' : 'WEEKLY COMPLETION VELOCITY'} ————
            </span>
            <p className="font-mono text-[11px] text-[var(--text-muted)] mt-0.5">
              {isAmountHabit
                ? `Daily logged ${habitUnit ?? 'units'} vs. target threshold`
                : 'Completions per week over recent 12 weeks'}
            </p>
          </div>
        </div>

        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            {isAmountHabit ? (
              <LineChart data={dailyAmountData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface-raised)',
                    borderColor: 'var(--border)',
                    borderRadius: '8px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                  }}
                />
                {targetVal != null && (
                  <ReferenceLine
                    y={targetVal}
                    stroke={resolvedColor}
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `Target (${targetVal})`,
                      fill: resolvedColor,
                      fontSize: 10,
                      position: 'top',
                    }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke={resolvedColor}
                  strokeWidth={2.4}
                  dot={{ r: 3, fill: resolvedColor }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            ) : (
              <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                <XAxis dataKey="weekLabel" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface-raised)',
                    borderColor: 'var(--border)',
                    borderRadius: '8px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="completions" fill={resolvedColor} radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weekday & Year Monthly Distribution Charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Weekday Breakdown */}
        <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
          <span className="font-mono text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] block mb-1">
            WEEKDAY CONSISTENCY
          </span>
          {weekdayData.weakestWeekday && (
            <p className="font-mono text-[10px] text-[var(--text-muted)] mb-3">
              Weakest on{' '}
              <span className="font-bold text-amber-500">
                {weekdayData.weakestWeekday.dayLabel} ({weekdayData.weakestWeekday.rate}%)
              </span>
            </p>
          )}
          <div style={{ width: '100%', height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekdayData.weekdays} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <XAxis dataKey="dayLabel" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                <YAxis domain={[0, 100]} stroke="var(--text-muted)" fontSize={9} tickLine={false} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface-raised)',
                    borderColor: 'var(--border)',
                    borderRadius: '6px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                  }}
                />
                <Bar dataKey="rate" fill={resolvedColor} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Year Monthly Trend */}
        <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
          <span className="font-mono text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] block mb-1">
            {calYear} MONTHLY RUNS
          </span>
          <p className="font-mono text-[10px] text-[var(--text-muted)] mb-3">
            Total completed days per month
          </p>
          <div style={{ width: '100%', height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <XAxis dataKey="monthLabel" stroke="var(--text-muted)" fontSize={9} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={9} tickLine={false} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface-raised)',
                    borderColor: 'var(--border)',
                    borderRadius: '6px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                  }}
                />
                <Bar dataKey="completedDays" fill={resolvedColor} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  )
}

