'use client'
// components/insights/InsightsClient.tsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar,
} from 'recharts'
import type { DailyScore } from '@/lib/supabase/types'

interface Props { scores: DailyScore[] }

type Tab = 'trends' | 'perfect' | 'missed' | 'best' | 'worst'

const TABS: { id: Tab; label: string }[] = [
  { id: 'trends',  label: 'trends'  },
  { id: 'perfect', label: 'perfect' },
  { id: 'missed',  label: 'missed'  },
  { id: 'best',    label: 'best runs' },
  { id: 'worst',   label: 'worst runs' },
]

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`
}
function formatDateShort(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
      <p style={{ fontSize: '0.8125rem', fontFamily: 'var(--font-mono)', color: 'var(--ink-tertiary)' }}>{msg}</p>
    </div>
  )
}

function RunRow({ label, sub, right, accent = false }: { label: string; sub: string; right: string; accent?: boolean }) {
  return (
    <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 16px' }}>
      <div>
        <p style={{ fontSize: '0.875rem', fontFamily: 'var(--font-mono)', color: 'var(--ink-primary)' }}>{label}</p>
        <p style={{ fontSize: '0.6875rem', color: 'var(--ink-tertiary)', marginTop: 2 }}>{sub}</p>
      </div>
      <span style={{ fontSize: '0.875rem', fontFamily: 'var(--font-mono)', color: accent ? 'var(--accent)' : 'var(--ink-secondary)', fontWeight: 400 }}>
        {right}
      </span>
    </div>
  )
}

export function InsightsClient({ scores }: Props) {
  const [tab, setTab] = useState<Tab>('trends')

  const sorted = [...scores].sort((a, b) => a.date.localeCompare(b.date))
  const perfectDays = sorted.filter(s => Number(s.completion_pct) >= 100)
  const missedDays  = sorted.filter(s => Number(s.completion_pct) === 0)

  const weeklyData: { week: string; avg: number }[] = []
  for (let i = 0; i < sorted.length; i += 7) {
    const chunk = sorted.slice(i, i + 7)
    const avg = chunk.reduce((s, x) => s + Number(x.completion_pct), 0) / chunk.length
    weeklyData.push({ week: formatDateShort(chunk[0].date), avg: Math.round(avg) })
  }

  interface Run { start: string; end: string; length: number; avgPct: number }
  function computeRuns(threshold: (pct: number) => boolean): Run[] {
    const runs: Run[] = []
    let runStart: string | null = null
    let runLen = 0; let runSum = 0
    for (const s of sorted) {
      if (threshold(Number(s.completion_pct))) {
        if (!runStart) runStart = s.date
        runLen++; runSum += Number(s.completion_pct)
      } else {
        if (runStart && runLen >= 2)
          runs.push({ start: runStart, end: sorted[sorted.indexOf(s) - 1].date, length: runLen, avgPct: Math.round(runSum / runLen) })
        runStart = null; runLen = 0; runSum = 0
      }
    }
    if (runStart && runLen >= 2)
      runs.push({ start: runStart, end: sorted[sorted.length - 1].date, length: runLen, avgPct: Math.round(runSum / runLen) })
    return runs.sort((a, b) => b.length - a.length).slice(0, 10)
  }

  const bestRuns  = computeRuns(p => p >= 80)
  const worstRuns = computeRuns(p => p < 40)
  const recent30  = sorted.slice(-30).map(s => ({ date: formatDateShort(s.date), pct: Math.round(Number(s.completion_pct)) }))

  const tooltipStyle = {
    contentStyle: { background: 'var(--bg-surface-1)', border: '1px solid var(--border-strong)', borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: 12 },
    labelStyle: { color: 'var(--ink-secondary)' },
    itemStyle:  { color: 'var(--accent)' },
  }

  return (
    <div className="page-container">
      {/* Path */}
      <motion.p className="text-path" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginBottom: 6 }}>
        ~/ insights
      </motion.p>

      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em', color: 'var(--ink-primary)' }}>
          analytics
        </h1>
      </motion.div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${tab === t.id ? 'var(--accent)' : 'var(--border-default)'}`,
              background: tab === t.id ? 'var(--accent-subtle)' : 'transparent',
              color: tab === t.id ? 'var(--accent)' : 'var(--ink-tertiary)',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all var(--duration-fast)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Trends */}
      {tab === 'trends' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card">
            <div className="section-header" style={{ marginBottom: 16 }}><span className="section-label">LAST 30 DAYS</span></div>
            {recent30.length === 0
              ? <p style={{ fontSize: '0.8125rem', color: 'var(--ink-tertiary)', fontFamily: 'var(--font-mono)' }}>no data yet — start checking in daily</p>
              : <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={recent30}>
                    <CartesianGrid strokeDasharray="2 4" />
                    <XAxis dataKey="date" interval="preserveStartEnd" />
                    <YAxis domain={[0, 100]} unit="%" />
                    <Tooltip {...tooltipStyle} />
                    <Line type="monotone" dataKey="pct" stroke="var(--accent)" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
            }
          </div>
          <div className="card">
            <div className="section-header" style={{ marginBottom: 16 }}><span className="section-label">WEEKLY AVERAGES</span></div>
            {weeklyData.length === 0
              ? <p style={{ fontSize: '0.8125rem', color: 'var(--ink-tertiary)', fontFamily: 'var(--font-mono)' }}>no data yet</p>
              : <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="2 4" />
                    <XAxis dataKey="week" />
                    <YAxis domain={[0, 100]} unit="%" />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="avg" fill="var(--accent)" opacity={0.7} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
            }
          </div>
        </motion.div>
      )}

      {/* Perfect */}
      {tab === 'perfect' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--ink-tertiary)', marginBottom: 16 }}>
            [ {perfectDays.length} ] perfect {perfectDays.length === 1 ? 'day' : 'days'} — 100% completion
          </p>
          {perfectDays.length === 0
            ? <Empty msg="no perfect days yet — you're building towards one" />
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[...perfectDays].reverse().map(s => (
                  <RunRow key={s.date}
                    label={formatDate(s.date)}
                    sub={`${Number(s.completed_habits)}/${Number(s.total_active_habits)} habits`}
                    right="100%"
                    accent
                  />
                ))}
              </div>
          }
        </motion.div>
      )}

      {/* Missed */}
      {tab === 'missed' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--ink-tertiary)', marginBottom: 16 }}>
            [ {missedDays.length} ] days with 0% completion
          </p>
          {missedDays.length === 0
            ? <Empty msg="no completely missed days — well done" />
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[...missedDays].reverse().map(s => (
                  <RunRow key={s.date} label={formatDate(s.date)} sub="0 habits completed" right="0%" />
                ))}
              </div>
          }
        </motion.div>
      )}

      {/* Best runs */}
      {tab === 'best' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--ink-tertiary)', marginBottom: 16 }}>
            longest stretches with 80%+ completion
          </p>
          {bestRuns.length === 0
            ? <Empty msg="no extended high-performance runs yet" />
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {bestRuns.map((run, i) => (
                  <RunRow key={i}
                    label={`${run.length} days`}
                    sub={`${formatDate(run.start)} – ${formatDate(run.end)}`}
                    right={`${run.avgPct}% avg`}
                    accent
                  />
                ))}
              </div>
          }
        </motion.div>
      )}

      {/* Worst runs */}
      {tab === 'worst' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--ink-tertiary)', marginBottom: 16 }}>
            longest stretches with under 40% completion
          </p>
          {worstRuns.length === 0
            ? <Empty msg="no extended low-performance runs — keep it up" />
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {worstRuns.map((run, i) => (
                  <RunRow key={i}
                    label={`${run.length} days`}
                    sub={`${formatDate(run.start)} – ${formatDate(run.end)}`}
                    right={`${run.avgPct}% avg`}
                  />
                ))}
              </div>
          }
        </motion.div>
      )}

    </div>
  )
}
