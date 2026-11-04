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
import { HABIT_COLORS, HABIT_ICONS, UNIT_PRESETS, getHabitColorVar, renderHabitIcon } from '@/lib/habit-theme'
import { HabitCardView } from '@/components/habit/HabitCardView'
import { ResponsiveSheet } from '@/components/ui/ResponsiveSheet'

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

// ── Customizer Fields (Type, Target, Unit, Step, Palette Color, Icon) ─────────

function HabitCustomizerFields({
  type,
  setType,
  targetValue,
  setTargetValue,
  unit,
  setUnit,
  stepValue,
  setStepValue,
  color,
  setColor,
  icon,
  setIcon,
}: {
  type: 'checkbox' | 'checklist' | 'amount'
  setType: (t: 'checkbox' | 'checklist' | 'amount') => void
  targetValue: number
  setTargetValue: (v: number) => void
  unit: string
  setUnit: (u: string) => void
  stepValue: number
  setStepValue: (s: number) => void
  color: string
  setColor: (c: string) => void
  icon: string
  setIcon: (i: string) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
      {/* Type Selector */}
      <div>
        <label className="text-label" style={{ fontSize: '0.6875rem', marginBottom: '4px', display: 'block' }}>Habit Type</label>
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['checkbox', 'checklist', 'amount'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className="btn btn-ghost"
              style={{
                flex: 1,
                fontSize: '0.75rem',
                textTransform: 'capitalize',
                padding: '6px 8px',
                border: type === t ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                backgroundColor: type === t ? 'var(--accent-glow)' : 'var(--surface)',
                color: type === t ? 'var(--accent)' : 'var(--text-muted)',
                fontWeight: type === t ? 600 : 400,
              }}
            >
              {t === 'checkbox' ? 'Checkbox' : t === 'checklist' ? 'Checklist' : 'Amount'}
            </button>
          ))}
        </div>
      </div>

      {/* Amount Specifics */}
      {type === 'amount' && (
        <div style={{ padding: '10px', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div>
              <label className="text-label" style={{ fontSize: '0.65rem', marginBottom: '4px', display: 'block' }}>Daily Target</label>
              <input
                type="number"
                min="0.01"
                max="1000000"
                step="any"
                className="input"
                value={targetValue}
                onChange={e => setTargetValue(parseFloat(e.target.value) || 0)}
                style={{ width: '100%', padding: '5px 8px', fontSize: '0.8125rem' }}
              />
            </div>
            <div>
              <label className="text-label" style={{ fontSize: '0.65rem', marginBottom: '4px', display: 'block' }}>Step Size (+/-)</label>
              <input
                type="number"
                min="0.01"
                max="100000"
                step="any"
                className="input"
                value={stepValue}
                onChange={e => setStepValue(parseFloat(e.target.value) || 1)}
                style={{ width: '100%', padding: '5px 8px', fontSize: '0.8125rem' }}
              />
            </div>
          </div>

          <div>
            <label className="text-label" style={{ fontSize: '0.65rem', marginBottom: '4px', display: 'block' }}>Unit</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
              {UNIT_PRESETS.map(u => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(u)}
                  style={{
                    fontSize: '0.6875rem',
                    fontFamily: 'var(--font-mono)',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    border: unit === u ? '1px solid var(--accent)' : '1px solid var(--border)',
                    backgroundColor: unit === u ? 'var(--accent-glow)' : 'transparent',
                    color: unit === u ? 'var(--accent)' : 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  {u}
                </button>
              ))}
            </div>
            <input
              type="text"
              maxLength={16}
              placeholder="Or custom unit (e.g. glasses, L, reps)..."
              className="input"
              value={unit}
              onChange={e => setUnit(e.target.value)}
              style={{ width: '100%', padding: '4px 8px', fontSize: '0.75rem' }}
            />
          </div>
        </div>
      )}

      {/* Color Swatches */}
      <div>
        <label className="text-label" style={{ fontSize: '0.6875rem', marginBottom: '4px', display: 'block' }}>Colour Palette</label>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {HABIT_COLORS.map(c => {
            const isSelected = color === c.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setColor(c.id)}
                title={c.label}
                aria-label={`Color ${c.label}`}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  backgroundColor: `var(--habit-color-${c.id})`,
                  border: isSelected ? '2.5px solid var(--text-primary)' : '1px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  outlineOffset: 2,
                  transition: 'transform 0.15s ease',
                  transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                }}
              >
                {isSelected && <Check size={12} strokeWidth={3} color="#FFFFFF" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Icon Picker (24 Lucide Icons) */}
      <div>
        <label className="text-label" style={{ fontSize: '0.6875rem', marginBottom: '4px', display: 'block' }}>Icon (Lucide)</label>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(32px, 1fr))',
            gap: '6px',
            maxHeight: 110,
            overflowY: 'auto',
            padding: '6px',
            backgroundColor: 'var(--surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
          }}
        >
          {HABIT_ICONS.map(i => {
            const isSelected = icon === i.id
            return (
              <button
                key={i.id}
                type="button"
                onClick={() => setIcon(i.id)}
                title={i.label}
                aria-label={`Icon ${i.label}`}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '6px',
                  border: isSelected ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                  backgroundColor: isSelected ? 'var(--accent-glow)' : 'transparent',
                  color: isSelected ? 'var(--accent)' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                {renderHabitIcon(i.id, 16)}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Sortable Habit Item ──────────────────────────────────────────────────────

function SortableHabitItem({ habit, onUpdate, onArchive }: {
  habit: HabitWithSubitems
  onUpdate: (id: string, updates: any) => Promise<void>
  onArchive: (id: string) => Promise<void>
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: habit.id })
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(habit.name)
  const [type, setType] = useState(habit.type as 'checkbox' | 'checklist' | 'amount')
  const [targetValue, setTargetValue] = useState(habit.target_value ?? 8)
  const [unit, setUnit] = useState(habit.unit ?? 'glasses')
  const [stepValue, setStepValue] = useState(habit.step_value ?? 1)
  const [color, setColor] = useState(habit.color ?? 'sage')
  const [icon, setIcon] = useState(habit.icon ?? 'check')
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
    const updates: any = {}
    if (trimmedName && trimmedName !== habit.name) {
      updates.name = trimmedName
    }
    if (type !== habit.type) {
      updates.type = type
    }
    if (type === 'amount') {
      updates.target_value = Number(targetValue) || 1
      updates.unit = unit.trim() || 'units'
      updates.step_value = Number(stepValue) || 1
    }
    if (color !== habit.color) updates.color = color
    if (icon !== habit.icon) updates.icon = icon

    if (Object.keys(updates).length > 0) {
      await onUpdate(habit.id, updates)
    }
    setEditing(false)
  }

  const handleCancelEdit = () => {
    setName(habit.name)
    setType(habit.type as any)
    setTargetValue(habit.target_value ?? 8)
    setUnit(habit.unit ?? 'glasses')
    setStepValue(habit.step_value ?? 1)
    setColor(habit.color ?? 'sage')
    setIcon(habit.icon ?? 'check')
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

  const resolvedColor = getHabitColorVar(color)

  return (
    <div ref={setNodeRef} style={style}>
      <div className="card" style={{
        padding: '12px 14px',
        marginBottom: '8px',
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

          {/* Tinted icon chip */}
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: `color-mix(in srgb, ${getHabitColorVar(habit.color)} 15%, transparent)`,
              color: getHabitColorVar(habit.color),
              border: `1px solid color-mix(in srgb, ${getHabitColorVar(habit.color)} 25%, transparent)`,
              flexShrink: 0,
            }}
          >
            {renderHabitIcon(habit.icon, 15)}
          </div>

          {/* Name */}
          <span style={{
            flex: 1, minWidth: 0, fontSize: '0.9375rem', fontWeight: 500,
            color: habit.is_archived ? 'var(--ink-tertiary)' : 'var(--ink-primary)',
            letterSpacing: '-0.01em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {habit.name}
            {habit.is_archived && <span style={{ fontSize: '0.75rem', color: 'var(--ink-tertiary)', marginLeft: '8px' }}>(Archived)</span>}
          </span>

          {/* Type badge */}
          {!habit.is_archived && (
            <span style={{
              flexShrink: 0,
              fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
              color: habit.type === 'checklist' ? 'var(--accent)' : habit.type === 'amount' ? getHabitColorVar(habit.color) : 'var(--ink-tertiary)',
              background: habit.type === 'checklist' ? 'var(--accent-glow)' : 'var(--bg-surface-3)',
              padding: '2px 8px', borderRadius: '99px',
            }}>
              {habit.type === 'amount' ? `${habit.target_value ?? 1} ${habit.unit ?? ''}` : habit.type}
            </span>
          )}

          {/* Actions */}
          {!habit.is_archived && (
            <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
              <button className="btn-icon" onClick={() => setEditing(true)} aria-label="Edit habit configuration"><Pencil size={15} /></button>
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
            </div>
          )}
        </div>

        {/* Edit Habit Sheet / Centered Modal */}
        <ResponsiveSheet
          isOpen={editing}
          onClose={handleCancelEdit}
          title={`Edit Habit · ${habit.name}`}
          description="Update habit properties, daily targets, and styling"
        >
          <div className="p-4 space-y-4 overflow-y-auto">
            <input
              className="input"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') handleCancelEdit() }}
              autoFocus
              style={{ width: '100%', padding: '10px 12px', fontSize: '1rem' }}
              placeholder="Habit name..."
            />

            <HabitCustomizerFields
              type={type}
              setType={setType}
              targetValue={targetValue}
              setTargetValue={setTargetValue}
              unit={unit}
              setUnit={setUnit}
              stepValue={stepValue}
              setStepValue={setStepValue}
              color={color}
              setColor={setColor}
              icon={icon}
              setIcon={setIcon}
            />

            {/* Live Preview */}
            <div style={{ marginTop: '8px' }}>
              <label className="text-label" style={{ fontSize: '0.65rem', marginBottom: '4px', display: 'block' }}>Live Preview</label>
              <HabitCardView
                variant={type}
                title={name.trim() || 'Habit Title'}
                subtitle={habit.notes}
                icon={icon}
                accentColor={color}
                completed={false}
                progressPct={type === 'amount' ? 50 : 0}
                currentAmount={type === 'amount' ? Math.round((targetValue / 2) * 10) / 10 : 0}
                targetAmount={type === 'amount' ? targetValue : null}
                unit={type === 'amount' ? unit : null}
                stepValue={stepValue}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '12px' }}>
              <button className="btn btn-primary" onClick={handleSaveEdit} aria-label="Save changes" style={{ padding: '10px 18px', minHeight: 44 }}>
                <Check size={15} /> Save Changes
              </button>
              <button className="btn btn-ghost" onClick={handleCancelEdit} aria-label="Cancel editing" style={{ padding: '10px 16px', minHeight: 44 }}>
                <X size={15} /> Cancel
              </button>
            </div>
          </div>
        </ResponsiveSheet>

        {/* Notes — collapsible, below name */}
        {!habit.is_archived && !editing && (
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
  const [newType, setNewType] = useState<'checkbox' | 'checklist' | 'amount'>('checkbox')
  const [newTarget, setNewTarget] = useState(8)
  const [newUnit, setNewUnit] = useState('glasses')
  const [newStep, setNewStep] = useState(1)
  const [newColor, setNewColor] = useState('sage')
  const [newIcon, setNewIcon] = useState('check')
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
    const payload: any = {
      name: newName.trim(),
      type: newType,
      notes: newNotes.trim() || null,
      color: newColor,
      icon: newIcon,
    }
    if (newType === 'amount') {
      payload.target_value = Number(newTarget) || 1
      payload.unit = newUnit.trim() || 'units'
      payload.step_value = Number(newStep) || 1
    }

    const result = await createHabitAction(payload)
    if (result.success && result.habit) {
      setHabits(prev => [...prev, { ...result.habit!, subitems: [] }])
      setNewName('')
      setNewNotes('')
      setShowNewNotes(false)
      setNewType('checkbox')
      setNewTarget(8)
      setNewUnit('glasses')
      setNewStep(1)
      setNewColor('sage')
      setNewIcon('check')
      setAdding(false)
    } else if (result.error) {
      alert(`Could not create habit: ${result.error}`)
    }
  }

  const handleUpdate = async (id: string, updates: any) => {
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
      {/* Add new habit button */}
      <div style={{ marginBottom: '20px' }}>
        <button
          className="btn btn-ghost"
          onClick={() => setAdding(true)}
          style={{ width: '100%', justifyContent: 'center', padding: '12px', minHeight: 44 }}
        >
          <Plus size={16} /> Add Habit
        </button>

        {/* Add Habit Sheet / Dialog */}
        <ResponsiveSheet
          isOpen={adding}
          onClose={() => {
            setAdding(false)
            setShowNewNotes(false)
            setNewNotes('')
          }}
          title="Add New Habit"
          description="Configure your habit discipline and daily target"
        >
          <div className="p-4 space-y-4 overflow-y-auto">
            <input
              className="input"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setAdding(false) }}
              placeholder="Habit name (e.g. Drink Water, Deep Work)..."
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
                style={{ fontSize: '1rem', fontWeight: 400, minHeight: 60, resize: 'vertical' }}
              />
            ) : (
              <button
                type="button"
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

            <HabitCustomizerFields
              type={newType}
              setType={setNewType}
              targetValue={newTarget}
              setTargetValue={setNewTarget}
              unit={newUnit}
              setUnit={setNewUnit}
              stepValue={newStep}
              setStepValue={setNewStep}
              color={newColor}
              setColor={setNewColor}
              icon={newIcon}
              setIcon={setNewIcon}
            />

            {/* Live Preview */}
            <div style={{ marginTop: '8px' }}>
              <label className="text-label" style={{ fontSize: '0.65rem', marginBottom: '4px', display: 'block' }}>Live Preview</label>
              <HabitCardView
                variant={newType}
                title={newName.trim() || 'Habit Name'}
                subtitle={newNotes.trim() || undefined}
                icon={newIcon}
                accentColor={newColor}
                completed={false}
                progressPct={newType === 'amount' ? 50 : 0}
                currentAmount={newType === 'amount' ? Math.round((newTarget / 2) * 10) / 10 : 0}
                targetAmount={newType === 'amount' ? newTarget : null}
                unit={newType === 'amount' ? newUnit : null}
                stepValue={newStep}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '12px' }}>
              <button className="btn btn-primary" onClick={handleCreate} aria-label="Confirm create habit" style={{ padding: '10px 18px', minHeight: 44 }}>
                <Plus size={15} /> Create Habit
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setAdding(false)
                  setShowNewNotes(false)
                  setNewNotes('')
                }}
                aria-label="Cancel adding habit"
                style={{ padding: '10px 16px', minHeight: 44 }}
              >
                <X size={15} /> Cancel
              </button>
            </div>
          </div>
        </ResponsiveSheet>
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
