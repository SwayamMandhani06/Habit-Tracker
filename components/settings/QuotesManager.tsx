'use client'
// components/settings/QuotesManager.tsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import type { Quote } from '@/lib/supabase/types'
import { addQuoteAction, removeQuoteAction } from '@/actions/quote.actions'

interface Props { initialQuotes: Quote[] }

export function QuotesManager({ initialQuotes }: Props) {
  const [quotes, setQuotes] = useState(initialQuotes.filter(q => q.is_active))
  const [newText, setNewText] = useState('')
  const [adding, setAdding] = useState(false)

  const handleAdd = async () => {
    if (!newText.trim()) return
    const result = await addQuoteAction({ text: newText.trim() })
    if (result.success && result.quote) {
      setQuotes(prev => [...prev, result.quote!])
      setNewText('')
      setAdding(false)
    }
  }

  const handleRemove = async (id: string) => {
    await removeQuoteAction({ id })
    setQuotes(prev => prev.filter(q => q.id !== id))
  }

  return (
    <div>
      <p style={{ fontSize: '0.875rem', color: 'var(--ink-tertiary)', marginBottom: '16px', lineHeight: 1.5 }}>
        One quote is shown each day on the dashboard, rotating daily by date.
      </p>

      {/* Add button */}
      <div style={{ marginBottom: '16px' }}>
        {adding ? (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <textarea
              className="input textarea"
              value={newText}
              onChange={e => setNewText(e.target.value)}
              placeholder="Enter a motivational quote..."
              rows={2}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-primary" onClick={handleAdd}><Plus size={15} /> Add Quote</button>
              <button className="btn btn-ghost" onClick={() => { setAdding(false); setNewText('') }}><X size={15} /></button>
            </div>
          </div>
        ) : (
          <button className="btn btn-ghost" onClick={() => setAdding(true)} style={{ width: '100%', justifyContent: 'center', padding: '10px' }}>
            <Plus size={16} /> Add Quote
          </button>
        )}
      </div>

      {/* Quotes list */}
      <p className="text-label" style={{ color: 'var(--ink-tertiary)', marginBottom: '10px' }}>
        Active Quotes ({quotes.length})
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <AnimatePresence>
          {quotes.map(q => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="card card-sm"
              style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}
            >
              <p style={{ flex: 1, fontSize: '0.875rem', color: 'var(--ink-secondary)', fontStyle: 'italic', lineHeight: 1.5 }}>
                &ldquo;{q.text}&rdquo;
              </p>
              <button
                className="btn-icon"
                onClick={() => handleRemove(q.id)}
                aria-label="Remove quote"
                style={{ color: 'var(--ink-tertiary)', flexShrink: 0 }}
              >
                <X size={15} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
