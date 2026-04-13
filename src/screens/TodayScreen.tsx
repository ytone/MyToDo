import { useState } from 'react'
import { Category, EstimatedTime, Task } from '../types'
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
  }

  const saveEdit = (task: Task) => {
    if (editTitle.trim()) {
      onUpdate({ ...task, title: editTitle.trim(), estimatedTime: editTime })
    }
    setEditingId(null)
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
                <div className="flex items-start gap-2">
                  <button
                    onClick={() => onComplete(task.id)}
                    className="mt-0.5 w-6 h-6 rounded-full border-2 border-slate-300 flex-shrink-0 active:border-emerald-400 active:bg-emerald-50 transition-colors"
                  />
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <input
                        autoFocus
                        className="w-full bg-slate-50 border border-indigo-300 rounded-lg px-2 py-1 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300 text-sm"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveEdit(task)}
                      />
                    ) : (
                      <p className="text-slate-800 font-medium leading-snug">{task.title}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-1.5 items-center">
                      <CategoryBadge category={cat} small />
                      {isEditing ? (
                        <div className="flex gap-1">
                          {TIMES.map(t => (
                            <button key={t} onClick={() => setEditTime(t)}
                              className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                                editTime === t
                                  ? 'bg-indigo-500 text-white border-indigo-500'
                                  : 'bg-white text-slate-400 border-slate-200'
                              }`}>
                              {TIME_LABELS[t]}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <TimeChip time={task.estimatedTime} small />
                      )}
                      {!isEditing && task.deadline && (
                        <span className={`text-xs font-medium ${
                          overdue ? 'text-rose-500' : today ? 'text-amber-500' : 'text-slate-400'
                        }`}>
                          {overdue ? '期限切れ ' : today ? '今日 ' : ''}
                          {format(parseISO(task.deadline), 'M/d(E)', { locale: ja })}
                        </span>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => setEditingId(null)}
                        className="text-xs text-slate-400 px-2 py-1 rounded-lg border border-slate-200">
                        キャンセル
                      </button>
                      <button onClick={() => saveEdit(task)}
                        className="text-xs text-white bg-indigo-500 px-2 py-1 rounded-lg">
                        保存
                      </button>
                    </div>
                  ) : (
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
                  )}
                </div>

                {task.subtasks.length > 0 && (
                  <div className="ml-8 space-y-1.5 pt-2 border-t border-slate-100">
                    {task.subtasks.map(s => (
                      <div key={s.id} className="flex items-center gap-2">
                        <button
                          onClick={() => toggleSubtask(task, s.id)}
                          className={`w-4 h-4 rounded border flex-shrink-0 transition-colors ${
                            s.completed
                              ? 'bg-emerald-400 border-emerald-400'
                              : 'border-slate-300'
                          }`}
                        >
                          {s.completed && <span className="text-[10px] text-white flex items-center justify-center w-full h-full">✓</span>}
                        </button>
                        <span className={`text-sm flex-1 ${s.completed ? 'line-through text-slate-400' : 'text-slate-600'}`}>
                          {s.title}
                        </span>
                        <TimeChip time={s.estimatedTime} small />
                      </div>
                    ))}
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
