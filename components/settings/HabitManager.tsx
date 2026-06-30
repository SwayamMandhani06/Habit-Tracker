'use client'
// components/settings/HabitManager.tsx — Full habit CRUD with DnD reorder
import { useState, useCallback } from 'react'
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
  GripVertical, Plus, Check, X, Archive, ChevronDown, ChevronUp, Pencil,
} from 'lucide-react'
import type { HabitWithSubitems } from '@/lib/supabase/types'
import {
  createHabitAction, updateHabitAction, reorderHabitsAction, archiveHabitAction,
  addSubitemAction, updateSubitemAction, removeSubitemAction, reorderSubitemsAction,
} from '@/actions/habit.actions'
import { useRouter } from 'next/navigation'

interface Props { initialHabits: HabitWithSubitems[] }

function SortableHabitItem({ habit, onUpdate, onArchive }: {
  habit: HabitWithSubitems
  onUpdate: (id: string, updates: { name?: string; type?: 'checkbox' | 'checklist' }) => Promise<void>
  onArchive: (id: string) => Promise<void>
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: habit.id })
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(habit.name)
  const [expanded, setExpanded] = useState(false)
  const [newSubitem, setNewSubitem] = useState('')
  const [editingSubitem, setEditingSubitem] = useState<string | null>(null)
  const [editingSubitemName, setEditingSubitemName] = useState('')
  const [subitems, setSubitems] = useState(habit.subitems)
  const router = useRouter()

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 'auto',
  }

  const saveName = async () => {
    if (name.trim() && name.trim() !== habit.name) {
      await onUpdate(habit.id, { name: name.trim() })
    }
    setEditing(false)
  }

  const handleAddSubitem = async () => {
    if (!newSubitem.trim()) return
    const result = await addSubitemAction({ habitId: habit.id, name: newSubitem.trim() })
    if (result.success && result.subitem) {
      setSubitems(prev => [...prev, result.subitem!])
      setNewSubitem('')
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
            <button {...attributes} {...listeners} style={{
              cursor: 'grab', color: 'var(--ink-disabled)', background: 'none', border: 'none', padding: '2px', display: 'flex', touchAction: 'none',
            }}>
              <GripVertical size={16} />
            </button>
          )}

          {/* Name / editing */}
          {editing ? (
            <input
              className="input"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditing(false) }}
              autoFocus
              style={{ flex: 1, padding: '4px 8px', fontSize: '0.875rem' }}
            />
          ) : (
            <span style={{
              flex: 1, fontSize: '0.9375rem', fontWeight: 400,
              color: habit.is_archived ? 'var(--ink-tertiary)' : 'var(--ink-primary)',
              letterSpacing: '-0.01em',
            }}>
              {habit.name}
              {habit.is_archived && <span style={{ fontSize: '0.75rem', color: 'var(--ink-tertiary)', marginLeft: '8px' }}>(archived)</span>}
            </span>
          )}

          {/* Type badge */}
          {!habit.is_archived && (
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
                  <button className="btn-icon" onClick={saveName} aria-label="Save"><Check size={15} /></button>
                  <button className="btn-icon" onClick={() => { setEditing(false); setName(habit.name) }} aria-label="Cancel"><X size={15} /></button>
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
                        <button className="btn-icon" onClick={() => handleSaveSubitem(s.id, editingSubitemName)}><Check size={13} /></button>
                        <button className="btn-icon" onClick={() => setEditingSubitem(null)}><X size={13} /></button>
                      </>
                    ) : (
                      <>
                        <span style={{ flex: 1, fontSize: '0.8125rem', color: 'var(--ink-secondary)' }}>{s.name}</span>
                        <button className="btn-icon" onClick={() => { setEditingSubitem(s.id); setEditingSubitemName(s.name) }}><Pencil size={13} /></button>
                        <button className="btn-icon" onClick={() => handleRemoveSubitem(s.id)} style={{ color: 'var(--color-danger)' }}><X size={13} /></button>
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

export function HabitManager({ initialHabits }: Props) {
  const [habits, setHabits] = useState(initialHabits)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<'checkbox' | 'checklist'>('checkbox')
  const [adding, setAdding] = useState(false)
  const router = useRouter()

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
    const result = await createHabitAction({ name: newName.trim(), type: newType })
    if (result.success && result.habit) {
      setHabits(prev => [...prev, { ...result.habit!, subitems: [] }])
      setNewName('')
      setAdding(false)
    }
  }

  const handleUpdate = async (id: string, updates: { name?: string; type?: 'checkbox' | 'checklist' }) => {
    await updateHabitAction({ id, ...updates })
    setHabits(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h))
  }

  const handleArchive = async (id: string) => {
    if (!confirm('Archive this habit? Historical data will be preserved.')) return
    await archiveHabitAction({ id })
    setHabits(prev => prev.map(h => h.id === id ? { ...h, is_archived: true, archived_at: new Date().toISOString() } : h))
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
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                value={newType}
                onChange={e => setNewType(e.target.value as 'checkbox' | 'checklist')}
                className="input"
                style={{ flex: 1 }}
              >
                <option value="checkbox">Simple checkbox</option>
                <option value="checklist">Checklist (sub-items)</option>
              </select>
              <button className="btn btn-primary" onClick={handleCreate}><Plus size={15} /> Add</button>
              <button className="btn btn-ghost" onClick={() => setAdding(false)}><X size={15} /></button>
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
            <div key={habit.id} className="card" style={{ padding: '12px 14px', marginBottom: '6px', opacity: 0.5 }}>
              <span style={{ fontSize: '0.9375rem', color: 'var(--ink-secondary)' }}>{habit.name}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--ink-tertiary)', marginLeft: '8px' }}>(archived)</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
