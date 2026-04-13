import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import { Category, EstimatedTime, SubTask, Task } from '../types'
import CategoryBadge from '../components/CategoryBadge'
import TimeChip from '../components/TimeChip'
import { format, isToday, isBefore, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'

interface Props {
  tasks: Task[]
  categories: Category[]
  onComplete: (id: string) => void
  onDelete: (id: string) => void
  onUpdate: (task: Task) => void
}

const TIMES: EstimatedTime[] = ['10', '30', '60', '60+']
const TIME_LABELS: Record<EstimatedTime, string> = {
  '10': '10分', '30': '30分', '60': '60分', '60+': '60分以上',
}

function isOverdue(deadline: string | null): boolean {
  if (!deadline) return false
  const d = parseISO(deadline)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return isBefore(d, today)
}

function isDueToday(deadline: string | null): boolean {
  if (!deadline) return false
  return isToday(parseISO(deadline))
}

export default function TodayScreen({ tasks, categories, onComplete, onDelete, onUpdate }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editTime, setEditTime] = useState<EstimatedTime>('30')
  const [editCategoryId, setEditCategoryId] = useState('')
  const [editDeadline, setEditDeadline] = useState('')
  const [editSubtasks, setEditSubtasks] = useState<SubTask[]>([])
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [newSubtaskTime, setNewSubtaskTime] = useState<EstimatedTime>('30')
  const [newSubtaskDeadline, setNewSubtaskDeadline] = useState('')

  const pending = tasks.filter(t => !t.completed)
  const done = tasks.filter(t => t.completed)

  const sorted = [...pending].sort((a, b) => {
    const aOver = isOverdue(a.deadline)
    const bOver = isOverdue(b.deadline)
    if (aOver !== bOver) return aOver ? -1 : 1
    const aToday = isDueToday(a.deadline)
    const bToday = isDueToday(b.deadline)
    if (aToday !== bToday) return aToday ? -1 : 1
    if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline)
    if (a.deadline) return -1
    if (b.deadline) return 1
    return a.createdAt.localeCompare(b.createdAt)
  })

  const startEdit = (task: Task) => {
    setEditingId(task.id)
    setEditTitle(task.title)
    setEditTime(task.estimatedTime)
    setEditCategoryId(task.categoryId)
    setEditDeadline(task.deadline ?? '')
    setEditSubtasks(task.subtasks.map(s => ({ ...s, deadline: s.deadline ?? null })))
    setNewSubtaskTitle('')
    setNewSubtaskTime('30')
    setNewSubtaskDeadline('')
  }

  const saveEdit = (task: Task) => {
    if (editTitle.trim()) {
      onUpdate({
        ...task,
        title: editTitle.trim(),
        estimatedTime: editTime,
        categoryId: editCategoryId,
        deadline: editDeadline || null,
        subtasks: editSubtasks,
      })
    }
    setEditingId(null)
  }

  const addEditSubtask = () => {
    if (!newSubtaskTitle.trim()) return
    setEditSubtasks(prev => [...prev, {
      id: uuid(),
      title: newSubtaskTitle.trim(),
      estimatedTime: newSubtaskTime,
      deadline: newSubtaskDeadline || null,
      completed: false,
    }])
    setNewSubtaskTitle('')
    setNewSubtaskDeadline('')
  }

  const updateEditSubtask = (id: string, changes: Partial<SubTask>) => {
    setEditSubtasks(prev => prev.map(s => s.id === id ? { ...s, ...changes } : s))
  }

  const removeEditSubtask = (id: string) => {
    setEditSubtasks(prev => prev.filter(s => s.id !== id))
  }

  const toggleSubtask = (task: Task, subtaskId: string) => {
    onUpdate({
      ...task,
      subtasks: task.subtasks.map(s =>
        s.id === subtaskId ? { ...s, completed: !s.completed } : s
      )
    })
  }

  if (sorted.length === 0 && done.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 space-y-2">
        <span className="text-4xl">✨</span>
        <p>タスクがありません</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold text-slate-700">タスク一覧</h2>

      {sorted.length > 0 && (
        <div className="space-y-3">
          {sorted.map(task => {
            const cat = categories.find(c => c.id === task.categoryId)
            const overdue = isOverdue(task.deadline)
            const today = isDueToday(task.deadline)
            const isEditing = editingId === task.id

            return (
              <div key={task.id} className="bg-white rounded-2xl p-4 space-y-2 border border-slate-100 shadow-sm">
                {/* ─── 通常表示 ─── */}
                {!isEditing && (
                  <>
                    <div className="flex items-start gap-2">
                      <button
                        onClick={() => onComplete(task.id)}
                        className="mt-0.5 w-6 h-6 rounded-full border-2 border-slate-300 flex-shrink-0 active:border-emerald-400 active:bg-emerald-50 transition-colors"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-800 font-medium leading-snug">{task.title}</p>
                        <div className="flex flex-wrap gap-2 mt-1.5 items-center">
                          <CategoryBadge category={cat} small />
                          <TimeChip time={task.estimatedTime} small />
                          {task.deadline && (
                            <span className={`text-xs font-medium ${
                              overdue ? 'text-rose-500' : today ? 'text-amber-500' : 'text-slate-400'
                            }`}>
                              {overdue ? '期限切れ ' : today ? '今日 ' : ''}
                              {format(parseISO(task.deadline), 'M/d(E)', { locale: ja })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => startEdit(task)}
                          className="text-slate-300 active:text-indigo-400 text-base leading-none px-1">
                          ✏️
                        </button>
                        <button onClick={() => onDelete(task.id)}
                          className="text-slate-300 active:text-rose-400 text-xl leading-none">
                          ×
                        </button>
                      </div>
                    </div>
                    {task.subtasks.length > 0 && (
                      <div className="ml-8 space-y-1.5 pt-2 border-t border-slate-100">
                        {task.subtasks.map(s => (
                          <div key={s.id} className="flex items-center gap-2">
                            <button
                              onClick={() => toggleSubtask(task, s.id)}
                              className={`w-4 h-4 rounded border flex-shrink-0 transition-colors ${
                                s.completed ? 'bg-emerald-400 border-emerald-400' : 'border-slate-300'
                              }`}
                            >
                              {s.completed && <span className="text-[10px] text-white flex items-center justify-center w-full h-full">✓</span>}
                            </button>
                            <span className={`text-sm flex-1 ${s.completed ? 'line-through text-slate-400' : 'text-slate-600'}`}>
                              {s.title}
                            </span>
                            {s.deadline && (
                              <span className={`text-xs flex-shrink-0 ${isOverdue(s.deadline) ? 'text-rose-400' : isDueToday(s.deadline) ? 'text-amber-400' : 'text-slate-400'}`}>
                                〆{s.deadline.slice(5).replace('-', '/')}
                              </span>
                            )}
                            <TimeChip time={s.estimatedTime} small />
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* ─── 編集モード ─── */}
                {isEditing && (
                  <div className="space-y-3">
                    {/* タイトル */}
                    <input
                      autoFocus
                      className="w-full bg-slate-50 border border-indigo-300 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300 text-sm"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveEdit(task)}
                    />

                    {/* カテゴリ */}
                    <div>
                      <p className="text-xs text-slate-400 mb-1">カテゴリ</p>
                      <div className="flex gap-2 flex-wrap">
                        {categories.map(c => (
                          <button key={c.id} onClick={() => setEditCategoryId(c.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                              editCategoryId === c.id
                                ? 'bg-slate-700 text-white border-slate-700'
                                : 'bg-white text-slate-500 border-slate-200'
                            }`}>
                            <span className={`w-2 h-2 rounded-full ${c.color}`} />
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 時間 */}
                    <div>
                      <p className="text-xs text-slate-400 mb-1">概算時間</p>
                      <div className="flex gap-1">
                        {TIMES.map(t => (
                          <button key={t} onClick={() => setEditTime(t)}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-medium border ${
                              editTime === t
                                ? 'bg-indigo-500 text-white border-indigo-500'
                                : 'bg-white text-slate-400 border-slate-200'
                            }`}>
                            {TIME_LABELS[t]}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 締め切り */}
                    <div>
                      <p className="text-xs text-slate-400 mb-1">締め切り</p>
                      <input
                        type="date"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 focus:outline-none [color-scheme:light]"
                        value={editDeadline}
                        onChange={e => setEditDeadline(e.target.value)}
                      />
                    </div>

                    {/* サブタスク */}
                    <div>
                      <p className="text-xs text-slate-400 mb-1">サブタスク</p>
                      <div className="space-y-2 mb-2">
                        {editSubtasks.map(s => (
                          <div key={s.id} className="bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <input
                                className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 focus:outline-none"
                                value={s.title}
                                onChange={e => updateEditSubtask(s.id, { title: e.target.value })}
                              />
                              <button onClick={() => removeEditSubtask(s.id)}
                                className="text-slate-300 active:text-rose-400 text-base leading-none flex-shrink-0">×</button>
                            </div>
                            <div className="flex gap-1">
                              {TIMES.map(t => (
                                <button key={t} onClick={() => updateEditSubtask(s.id, { estimatedTime: t })}
                                  className={`flex-1 py-1 rounded text-[10px] font-medium border ${
                                    s.estimatedTime === t
                                      ? 'bg-indigo-500 text-white border-indigo-500'
                                      : 'bg-white text-slate-400 border-slate-200'
                                  }`}>
                                  {TIME_LABELS[t]}
                                </button>
                              ))}
                            </div>
                            <input
                              type="date"
                              className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-500 focus:outline-none [color-scheme:light]"
                              value={s.deadline ?? ''}
                              onChange={e => updateEditSubtask(s.id, { deadline: e.target.value || null })}
                            />
                          </div>
                        ))}
                      </div>

                      {/* 新サブタスク追加フォーム */}
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-1.5">
                        <input
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 placeholder-slate-300 focus:outline-none"
                          placeholder="+ サブタスク名"
                          value={newSubtaskTitle}
                          onChange={e => setNewSubtaskTitle(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addEditSubtask()}
                        />
                        <div className="flex gap-1">
                          {TIMES.map(t => (
                            <button key={t} onClick={() => setNewSubtaskTime(t)}
                              className={`flex-1 py-1 rounded text-[10px] font-medium border ${
                                newSubtaskTime === t
                                  ? 'bg-indigo-500 text-white border-indigo-500'
                                  : 'bg-white text-slate-400 border-slate-200'
                              }`}>
                              {TIME_LABELS[t]}
                            </button>
                          ))}
                        </div>
                        <input
                          type="date"
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-500 focus:outline-none [color-scheme:light]"
                          value={newSubtaskDeadline}
                          onChange={e => setNewSubtaskDeadline(e.target.value)}
                        />
                        <button onClick={addEditSubtask}
                          className="w-full bg-white border border-slate-200 text-slate-500 rounded py-1 text-xs font-medium active:bg-slate-100">
                          追加
                        </button>
                      </div>
                    </div>

                    {/* 保存・キャンセル */}
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => setEditingId(null)}
                        className="flex-1 py-2 rounded-xl text-sm border border-slate-200 text-slate-500 bg-white">
                        キャンセル
                      </button>
                      <button onClick={() => saveEdit(task)}
                        className="flex-1 py-2 rounded-xl text-sm bg-indigo-500 text-white font-medium">
                        保存
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {done.length > 0 && (
        <div>
          <h3 className="text-sm text-slate-400 font-medium mb-2">完了済み ({done.length})</h3>
          <div className="space-y-2">
            {done.map(task => (
              <div key={task.id} className="bg-white/60 rounded-2xl px-4 py-3 flex items-center gap-3 border border-slate-100">
                <div className="w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] text-white">✓</span>
                </div>
                <span className="flex-1 text-slate-400 line-through text-sm">{task.title}</span>
                <button onClick={() => onDelete(task.id)} className="text-slate-300 active:text-rose-400">×</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
