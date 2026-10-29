'use client'
// components/settings/HabitManager.tsx — Full habit CRUD with DnD reorder + notes
import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical, Plus, Check, X, Archive, ChevronDown, ChevronUp, Pencil, StickyNote, RotateCcw, Trash2,
} from 'lucide-react'
import type { HabitWithSubitems } from '@/lib/supabase/types'
import {
  createHabitAction, updateHabitAction, reorderHabitsAction, archiveHabitAction, unarchiveHabitAction, deleteHabitAction,
  addSubitemAction, updateSubitemAction, removeSubitemAction, reorderSubitemsAction,
} from '@/actions/habit.actions'

interface Props { initialHabits: HabitWithSubitems[] }

// ── Notes Section ────────────────────────────────────────────────────────────

function HabitNotesSection({
  habitId,
  initialNote,
  onSave,
}: {
  habitId: string
  initialNote: string | null
  onSave: (notes: string | null) => void
}) {
  const [open, setOpen] = useState(Boolean(initialNote))
  const [value, setValue] = useState(initialNote ?? '')
  const [saving, setSaving] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleChange = (v: string) => {
    setValue(v)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(async () => {
      setSaving(true)
      await updateHabitAction({ id: habitId, notes: v.trim() || null })
      onSave(v.trim() || null)
      setSaving(false)
    }, 800)
  }

  const handleToggle = () => {
    if (open && !value.trim()) {
      setOpen(false)
      return
    }
    setOpen(o => !o)
  }

  return (
    <div style={{ marginTop: '6px', paddingLeft: '26px' }}>
      {/* Trigger */}
      <button
        onClick={handleToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '2px 0',
          color: open ? 'var(--accent)' : 'var(--ink-tertiary)',
          fontSize: '0.6875rem',
          fontFamily: 'var(--font-mono)',
          fontWeight: 500,
          letterSpacing: '0.04em',
          transition: 'color var(--duration-fast)',
        }}
      >
        <StickyNote size={11} />
        {open
          ? 'Hide Note'
          : initialNote
            ? (
              <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>
                {initialNote}
              </span>
            )
            : 'Add Note'
        }
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ paddingTop: '6px', position: 'relative' }}>
              <textarea
                className="input textarea"
                value={value}
                onChange={e => handleChange(e.target.value)}
                placeholder="Add a note..."
                rows={2}
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 400,
                  minHeight: 60,
                  resize: 'vertical',
                  paddingRight: '40px',
                }}
              />
              {saving && (
                <span style={{
                  position: 'absolute',
                  right: 10,
                  bottom: 10,
                  fontSize: '0.6rem',
                  color: 'var(--ink-tertiary)',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.04em',
                }}>
                  Saving…
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Sortable Habit Item ──────────────────────────────────────────────────────

function SortableHabitItem({ habit, onUpdate, onArchive }: {
  habit: HabitWithSubitems
  onUpdate: (id: string, updates: { name?: string; type?: 'checkbox' | 'checklist'; notes?: string | null }) => Promise<void>
  onArchive: (id: string) => Promise<void>
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: habit.id })
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(habit.name)
  const [type, setType] = useState(habit.type)
  const [expanded, setExpanded] = useState(false)
  const [newSubitem, setNewSubitem] = useState('')
  const [editingSubitem, setEditingSubitem] = useState<string | null>(null)
  const [editingSubitemName, setEditingSubitemName] = useState('')
  const [subitems, setSubitems] = useState(habit.subitems)
  const [habitNote, setHabitNote] = useState<string | null>(habit.notes)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 'auto' as const,
  }

  const handleSaveEdit = async () => {
    const trimmedName = name.trim()
    const updates: { name?: string; type?: 'checkbox' | 'checklist' } = {}
    if (trimmedName && trimmedName !== habit.name) {
      updates.name = trimmedName
    }
    if (type !== habit.type) {
      updates.type = type
    }
    if (Object.keys(updates).length > 0) {
      await onUpdate(habit.id, updates)
    }
    setEditing(false)
  }

  const handleCancelEdit = () => {
    setName(habit.name)
    setType(habit.type)
    setEditing(false)
  }

  const handleAddSubitem = async () => {
    if (!newSubitem.trim()) return
    const result = await addSubitemAction({ habitId: habit.id, name: newSubitem.trim() })
    if (result.success && result.subitem) {
      setSubitems(prev => [...prev, result.subitem!])
      setNewSubitem('')
    } else if (result.error) {
      alert(`Could not add sub-item: ${result.error}`)
    }
  }

  const handleRemoveSubitem = async (id: string) => {
    await removeSubitemAction({ id })
    setSubitems(prev => prev.filter(s => s.id !== id))
  }

  const handleSaveSubitem = async (id: string, newName: string) => {
    await updateSubitemAction({ id, name: newName })
    setSubitems(prev => prev.map(s => s.id === id ? { ...s, name: newName } : s))
    setEditingSubitem(null)
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div className="card" style={{
        padding: '12px 14px',
        marginBottom: '6px',
        background: habit.is_archived ? 'var(--bg-surface-2)' : undefined,
        opacity: habit.is_archived ? 0.6 : 1,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Drag handle */}
          {!habit.is_archived && (
            <button
              {...attributes}
              {...listeners}
              aria-label={`Drag to reorder habit ${habit.name}`}
              style={{
                cursor: 'grab', color: 'var(--text-muted)', background: 'none', border: 'none', padding: '0 4px', display: 'flex', alignItems: 'center', touchAction: 'none', userSelect: 'none'
              }}
              title="Drag to reorder"
            >
              <GripVertical size={15} />
            </button>
          )}

          {/* Name & Type editing */}
          {editing ? (
            <div style={{ flex: 1, display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                className="input"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') handleCancelEdit() }}
                autoFocus
                style={{ flex: 1, padding: '4px 8px', fontSize: '0.875rem' }}
              />
              <select
                value={type}
                onChange={e => setType(e.target.value as 'checkbox' | 'checklist')}
                className="input"
                style={{ width: 'auto', padding: '4px 8px', fontSize: '0.75rem' }}
              >
                <option value="checkbox">Checkbox</option>
                <option value="checklist">Checklist</option>
              </select>
            </div>
          ) : (
            <span style={{
              flex: 1, fontSize: '0.9375rem', fontWeight: 400,
              color: habit.is_archived ? 'var(--ink-tertiary)' : 'var(--ink-primary)',
              letterSpacing: '-0.01em',
            }}>
              {habit.name}
              {habit.is_archived && <span style={{ fontSize: '0.75rem', color: 'var(--ink-tertiary)', marginLeft: '8px' }}>(Archived)</span>}
            </span>
          )}

          {/* Type badge */}
          {!habit.is_archived && !editing && (
            <span style={{
              fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
              color: habit.type === 'checklist' ? 'var(--accent)' : 'var(--ink-tertiary)',
              background: habit.type === 'checklist' ? 'var(--accent-glow)' : 'var(--bg-surface-3)',
              padding: '2px 8px', borderRadius: '99px',
            }}>
              {habit.type}
            </span>
          )}

          {/* Actions */}
          {!habit.is_archived && (
            <div style={{ display: 'flex', gap: '4px' }}>
              {editing ? (
                <>
                  <button className="btn-icon" onClick={handleSaveEdit} aria-label="Save"><Check size={15} /></button>
                  <button className="btn-icon" onClick={handleCancelEdit} aria-label="Cancel"><X size={15} /></button>
                </>
              ) : (
                <>
                  <button className="btn-icon" onClick={() => setEditing(true)} aria-label="Rename"><Pencil size={15} /></button>
                  {habit.type === 'checklist' && (
                    <button className="btn-icon" onClick={() => setExpanded(e => !e)} aria-label="Expand subitems">
                      {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  )}
                  <button
                    className="btn-icon"
                    onClick={() => onArchive(habit.id)}
                    aria-label="Archive"
                    style={{ color: 'var(--color-danger)' }}
                    title="Archive habit (preserves historical data)"
                  >
                    <Archive size={15} />
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Notes — collapsible, below name */}
        {!habit.is_archived && (
          <HabitNotesSection
            habitId={habit.id}
            initialNote={habitNote}
            onSave={setHabitNote}
          />
        )}

        {/* Subitems editor */}
        <AnimatePresence>
          {expanded && habit.type === 'checklist' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                {subitems.map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 0' }}>
                    {editingSubitem === s.id ? (
                      <>
                        <input
                          className="input"
                          value={editingSubitemName}
                          onChange={e => setEditingSubitemName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveSubitem(s.id, editingSubitemName) }}
                          autoFocus
                          style={{ flex: 1, padding: '4px 8px', fontSize: '0.8125rem' }}
                        />
                        <button className="btn-icon" onClick={() => handleSaveSubitem(s.id, editingSubitemName)} aria-label="Save sub-item name"><Check size={13} /></button>
                        <button className="btn-icon" onClick={() => setEditingSubitem(null)} aria-label="Cancel editing sub-item"><X size={13} /></button>
                      </>
                    ) : (
                      <>
                        <span style={{ flex: 1, fontSize: '0.8125rem', color: 'var(--ink-secondary)' }}>{s.name}</span>
                        <button className="btn-icon" onClick={() => { setEditingSubitem(s.id); setEditingSubitemName(s.name) }} aria-label={`Rename sub-item ${s.name}`}><Pencil size={13} /></button>
                        <button className="btn-icon" onClick={() => handleRemoveSubitem(s.id)} style={{ color: 'var(--color-danger)' }} aria-label={`Remove sub-item ${s.name}`}><X size={13} /></button>
                      </>
                    )}
                  </div>
                ))}

                {/* Add subitem */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <input
                    className="input"
                    value={newSubitem}
                    onChange={e => setNewSubitem(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddSubitem() }}
                    placeholder="Add sub-item..."
                    style={{ flex: 1, padding: '6px 10px', fontSize: '0.8125rem' }}
                  />
                  <button className="btn btn-ghost" onClick={handleAddSubitem} style={{ padding: '6px 12px' }}>
                    <Plus size={14} /> Add
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── HabitManager ─────────────────────────────────────────────────────────────

export function HabitManager({ initialHabits }: Props) {
  const [habits, setHabits] = useState(initialHabits)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<'checkbox' | 'checklist'>('checkbox')
  const [newNotes, setNewNotes] = useState('')
  const [showNewNotes, setShowNewNotes] = useState(false)
  const [adding, setAdding] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const activeHabits = habits.filter(h => !h.is_archived)
  const archivedHabits = habits.filter(h => h.is_archived)

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = activeHabits.findIndex(h => h.id === active.id)
    const newIndex = activeHabits.findIndex(h => h.id === over.id)
    const reordered = arrayMove(activeHabits, oldIndex, newIndex)
    const allHabits = [...reordered, ...archivedHabits]
    setHabits(allHabits)
    await reorderHabitsAction({ orderedIds: reordered.map(h => h.id) })
  }, [activeHabits, archivedHabits])

  const handleCreate = async () => {
    if (!newName.trim()) return
    const result = await createHabitAction({
      name: newName.trim(),
      type: newType,
      notes: newNotes.trim() || null,
    })
    if (result.success && result.habit) {
      setHabits(prev => [...prev, { ...result.habit!, subitems: [] }])
      setNewName('')
      setNewNotes('')
      setShowNewNotes(false)
      setAdding(false)
    } else if (result.error) {
      alert(`Could not create habit: ${result.error}`)
    }
  }

  const handleUpdate = async (id: string, updates: { name?: string; type?: 'checkbox' | 'checklist'; notes?: string | null }) => {
    await updateHabitAction({ id, ...updates })
    setHabits(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h))
  }

  const handleArchive = async (id: string) => {
    if (!confirm('Archive this habit? Historical data will be preserved.')) return
    await archiveHabitAction({ id })
    setHabits(prev => prev.map(h => h.id === id ? { ...h, is_archived: true, archived_at: new Date().toISOString() } : h))
  }

  const handleUnarchive = async (id: string) => {
    const res = await unarchiveHabitAction({ id })
    if (res?.error) {
      alert(`Could not unarchive habit: ${res.error}`)
      return
    }
    setHabits(prev => prev.map(h => h.id === id ? { ...h, is_archived: false, archived_at: null } : h))
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Permanently delete "${name}"? This will delete the habit and its completion history.`)) return
    const res = await deleteHabitAction({ id })
    if (res?.error) {
      alert(`Could not delete habit: ${res.error}`)
      return
    }
    setHabits(prev => prev.filter(h => h.id !== id))
  }

  return (
    <div>
      {/* Add new habit */}
      <div style={{ marginBottom: '20px' }}>
        {adding ? (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              className="input"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setAdding(false) }}
              placeholder="Habit name..."
              autoFocus
            />
            {/* Notes toggle for new habit */}
            {showNewNotes ? (
              <textarea
                className="input textarea"
                value={newNotes}
                onChange={e => setNewNotes(e.target.value)}
                placeholder="Optional note, context, or reminder..."
                rows={2}
                style={{ fontSize: '0.8125rem', fontWeight: 400, minHeight: 60, resize: 'vertical' }}
              />
            ) : (
              <button
                onClick={() => setShowNewNotes(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none',
                  cursor: 'pointer', padding: '0', color: 'var(--ink-tertiary)', fontSize: '0.6875rem',
                  fontFamily: 'var(--font-mono)', fontWeight: 500, letterSpacing: '0.04em',
                }}
              >
                <StickyNote size={11} /> Add Note
              </button>
            )}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                value={newType}
                onChange={e => setNewType(e.target.value as 'checkbox' | 'checklist')}
                className="input"
                style={{ flex: 1 }}
              >
                <option value="checkbox">Simple Checkbox</option>
                <option value="checklist">Checklist (Sub-Items)</option>
              </select>
              <button className="btn btn-primary" onClick={handleCreate} aria-label="Confirm create habit"><Plus size={15} /> Add</button>
              <button className="btn btn-ghost" onClick={() => { setAdding(false); setShowNewNotes(false); setNewNotes('') }} aria-label="Cancel adding habit"><X size={15} /></button>
            </div>
          </div>
        ) : (
          <button className="btn btn-ghost" onClick={() => setAdding(true)} style={{ width: '100%', justifyContent: 'center', padding: '10px' }}>
            <Plus size={16} /> Add Habit
          </button>
        )}
      </div>

      {/* Active habits (sortable) */}
      <p className="text-label" style={{ color: 'var(--ink-tertiary)', marginBottom: '10px' }}>
        Active ({activeHabits.length})
      </p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={activeHabits.map(h => h.id)} strategy={verticalListSortingStrategy}>
          {activeHabits.map(habit => (
            <SortableHabitItem
              key={habit.id}
              habit={habit}
              onUpdate={handleUpdate}
              onArchive={handleArchive}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* Archived habits */}
      {archivedHabits.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <p className="text-label" style={{ color: 'var(--ink-tertiary)', marginBottom: '10px' }}>
            Archived ({archivedHabits.length})
          </p>
          {archivedHabits.map(habit => (
            <div
              key={habit.id}
              className="card"
              style={{
                padding: '12px 14px',
                marginBottom: '6px',
                opacity: 0.8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <span style={{ fontSize: '0.9375rem', color: 'var(--ink-secondary)' }}>{habit.name}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--ink-tertiary)', marginLeft: '8px' }}>(Archived)</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  className="btn btn-ghost"
                  onClick={() => handleUnarchive(habit.id)}
                  title="Restore habit"
                  aria-label={`Restore habit ${habit.name}`}
                  style={{ fontSize: '0.75rem', padding: '5px 10px', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                >
                  <RotateCcw size={13} />
                  <span>Restore</span>
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => handleDelete(habit.id, habit.name)}
                  title="Delete permanently"
                  aria-label={`Delete habit ${habit.name} permanently`}
                  style={{ color: 'var(--color-danger)', fontSize: '0.75rem', padding: '5px 10px', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
