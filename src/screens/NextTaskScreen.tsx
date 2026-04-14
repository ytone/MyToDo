import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import { Category, EstimatedTime, SubTask, Task } from '../types'
import CategoryBadge from '../components/CategoryBadge'
import TimeChip from '../components/TimeChip'
import { format, parseISO, differenceInDays, isToday, isBefore } from 'date-fns'
import { ja } from 'date-fns/locale'

interface Props {
  tasks: Task[]
  categories: Category[]
  onComplete: (id: string) => void
  onUpdate: (task: Task) => void
}

type TimeFilter = EstimatedTime | 'any'

const FILTERS: { id: TimeFilter; label: string }[] = [
  { id: 'any', label: 'すべて' },
  { id: '10',  label: '10分' },
  { id: '30',  label: '30分' },
  { id: '60',  label: '60分' },
  { id: '60+', label: '60分以上' },
]

const TIMES: EstimatedTime[] = ['10', '30', '60', '60+']
const TIME_LABELS: Record<EstimatedTime, string> = {
  '10': '10分', '30': '30分', '60': '60分', '60+': '60分以上',
}

function urgencyScore(task: Task): number {
  let score = 0
  if (task.deadline) {
    const days = differenceInDays(parseISO(task.deadline), new Date())
    if (days < 0) score += 1000
    else if (days === 0) score += 500
    else score += Math.max(0, 100 - days * 10)
  }
  return score
}

function isOverdue(deadline: string | null) {
  if (!deadline) return false
  const d = parseISO(deadline)
  const today = new Date(); today.setHours(0,0,0,0)
  return isBefore(d, today)
}

export default function NextTaskScreen({ tasks, categories, onComplete, onUpdate }: Props) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('any')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // 編集用state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editTime, setEditTime] = useState<EstimatedTime>('30')
  const [editCategoryId, setEditCategoryId] = useState('')
  const [editDeadline, setEditDeadline] = useState('')
  const [editSubtasks, setEditSubtasks] = useState<SubTask[]>([])
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [newSubtaskTime, setNewSubtaskTime] = useState<EstimatedTime>('30')
  const [newSubtaskDeadline, setNewSubtaskDeadline] = useState('')

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
      onUpdate({ ...task, title: editTitle.trim(), estimatedTime: editTime, categoryId: editCategoryId, deadline: editDeadline || null, subtasks: editSubtasks })
    }
    setEditingId(null)
  }

  const addEditSubtask = () => {
    if (!newSubtaskTitle.trim()) return
    setEditSubtasks(prev => [...prev, { id: uuid(), title: newSubtaskTitle.trim(), estimatedTime: newSubtaskTime, deadline: newSubtaskDeadline || null, completed: false }])
    setNewSubtaskTitle('')
    setNewSubtaskDeadline('')
  }

  const toggleSubtask = (task: Task, subtaskId: string) => {
    onUpdate({ ...task, subtasks: task.subtasks.map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s) })
  }

  const pending = tasks.filter(t => !t.completed)

  const filtered = pending.filter(t => {
    const timeOk = timeFilter === 'any' || t.estimatedTime === timeFilter
    const catOk = categoryFilter === 'all' || t.categoryId === categoryFilter
    return timeOk && catOk
  })

  // 〆切近い順（期限切れ → 今日 → 近い順 → 期限なし）
  const sorted = [...filtered].sort((a, b) => {
    const aOver = isOverdue(a.deadline)
    const bOver = isOverdue(b.deadline)
    if (aOver !== bOver) return aOver ? -1 : 1
    const aToday = a.deadline ? isToday(parseISO(a.deadline)) : false
    const bToday = b.deadline ? isToday(parseISO(b.deadline)) : false
    if (aToday !== bToday) return aToday ? -1 : 1
    if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline)
    if (a.deadline) return -1
    if (b.deadline) return 1
    return a.createdAt.localeCompare(b.createdAt)
  })

  const suggested = sorted[0]

  // タスクカード（「他のタスク」用、展開・編集対応）
  const renderTaskRow = (task: Task) => {
    const cat = categories.find(c => c.id === task.categoryId)
    const isExpanded = expandedId === task.id
    const isEditing = editingId === task.id
    const over = isOverdue(task.deadline)
    const tod = task.deadline ? isToday(parseISO(task.deadline)) : false

    return (
      <div key={task.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {/* 行タップで展開 */}
        <div
          className="px-4 py-3 flex items-center gap-3 cursor-pointer active:bg-slate-50"
          onClick={() => {
            if (isEditing) return
            setExpandedId(isExpanded ? null : task.id)
          }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-700 truncate">{task.title}</p>
            <div className="flex gap-2 mt-1 items-center">
              <CategoryBadge category={cat} small />
              <TimeChip time={task.estimatedTime} small />
              {task.deadline && (
                <span className={`text-xs font-medium ${over ? 'text-rose-500' : tod ? 'text-amber-500' : 'text-slate-400'}`}>
                  〆{format(parseISO(task.deadline), 'M/d(E)', { locale: ja })}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={e => { e.stopPropagation(); onComplete(task.id) }}
            className="flex-shrink-0 w-8 h-8 rounded-full border-2 border-slate-200 active:border-emerald-400 active:bg-emerald-50 transition-colors"
          />
        </div>

        {/* 展開エリア */}
        {isExpanded && !isEditing && (
          <div className="px-4 pb-3 border-t border-slate-100 pt-2 space-y-2">
            {task.subtasks.length > 0 && (
              <div className="space-y-1.5">
                {task.subtasks.map(s => (
                  <div key={s.id} className="flex items-center gap-2">
                    <button
                      onClick={() => toggleSubtask(task, s.id)}
                      className={`w-4 h-4 rounded border flex-shrink-0 transition-colors ${s.completed ? 'bg-emerald-400 border-emerald-400' : 'border-slate-300'}`}
                    >
                      {s.completed && <span className="text-[10px] text-white flex items-center justify-center w-full h-full">✓</span>}
                    </button>
                    <span className={`text-sm flex-1 ${s.completed ? 'line-through text-slate-400' : 'text-slate-600'}`}>{s.title}</span>
                    {s.deadline && <span className={`text-xs ${isOverdue(s.deadline) ? 'text-rose-400' : 'text-slate-400'}`}>〆{s.deadline.slice(5).replace('-','/')}</span>}
                    <TimeChip time={s.estimatedTime} small />
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => startEdit(task)}
              className="w-full py-1.5 rounded-lg text-xs border border-slate-200 text-slate-500 bg-slate-50 active:bg-slate-100">
              ✏️ 編集
            </button>
          </div>
        )}

        {/* 編集モード */}
        {isEditing && (
          <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
            <input autoFocus className="w-full bg-slate-50 border border-indigo-300 rounded-lg px-3 py-2 text-sm text-slate-800 font-medium focus:outline-none" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
            <div>
              <p className="text-xs text-slate-400 mb-1">カテゴリ</p>
              <div className="flex gap-2 flex-wrap">
                {categories.map(c => (
                  <button key={c.id} onClick={() => setEditCategoryId(c.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${editCategoryId === c.id ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-500 border-slate-200'}`}>
                    <span className={`w-2 h-2 rounded-full ${c.color}`} />{c.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">概算時間</p>
              <div className="flex gap-1">
                {TIMES.map(t => (
                  <button key={t} onClick={() => setEditTime(t)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border ${editTime === t ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-slate-400 border-slate-200'}`}>
                    {TIME_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">締め切り</p>
              <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 focus:outline-none [color-scheme:light]" value={editDeadline} onChange={e => setEditDeadline(e.target.value)} />
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">サブタスク</p>
              <div className="space-y-2 mb-2">
                {editSubtasks.map(s => (
                  <div key={s.id} className="bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <input className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 focus:outline-none" value={s.title} onChange={e => setEditSubtasks(prev => prev.map(x => x.id === s.id ? { ...x, title: e.target.value } : x))} />
                      <button onClick={() => setEditSubtasks(prev => prev.filter(x => x.id !== s.id))} className="text-slate-300 active:text-rose-400 text-base">×</button>
                    </div>
                    <div className="flex gap-1">
                      {TIMES.map(t => (
                        <button key={t} onClick={() => setEditSubtasks(prev => prev.map(x => x.id === s.id ? { ...x, estimatedTime: t } : x))}
                          className={`flex-1 py-1 rounded text-[10px] font-medium border ${s.estimatedTime === t ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-slate-400 border-slate-200'}`}>
                          {TIME_LABELS[t]}
                        </button>
                      ))}
                    </div>
                    <input type="date" className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-500 focus:outline-none [color-scheme:light]" value={s.deadline ?? ''} onChange={e => setEditSubtasks(prev => prev.map(x => x.id === s.id ? { ...x, deadline: e.target.value || null } : x))} />
                  </div>
                ))}
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-1.5">
                <input className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 placeholder-slate-300 focus:outline-none" placeholder="+ サブタスク名" value={newSubtaskTitle} onChange={e => setNewSubtaskTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && addEditSubtask()} />
                <div className="flex gap-1">
                  {TIMES.map(t => (
                    <button key={t} onClick={() => setNewSubtaskTime(t)}
                      className={`flex-1 py-1 rounded text-[10px] font-medium border ${newSubtaskTime === t ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-slate-400 border-slate-200'}`}>
                      {TIME_LABELS[t]}
                    </button>
                  ))}
                </div>
                <input type="date" className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-500 focus:outline-none [color-scheme:light]" value={newSubtaskDeadline} onChange={e => setNewSubtaskDeadline(e.target.value)} />
                <button onClick={addEditSubtask} className="w-full bg-white border border-slate-200 text-slate-500 rounded py-1 text-xs font-medium active:bg-slate-100">追加</button>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditingId(null)} className="flex-1 py-2 rounded-xl text-sm border border-slate-200 text-slate-500">キャンセル</button>
              <button onClick={() => saveEdit(task)} className="flex-1 py-2 rounded-xl text-sm bg-indigo-500 text-white font-medium">保存</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-4 space-y-5">
      <h2 className="text-xl font-bold text-slate-700">次にやること</h2>

      {/* Time filter */}
      <div>
        <p className="text-sm text-slate-400 mb-2">今使える時間</p>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setTimeFilter(f.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                timeFilter === f.id
                  ? 'bg-indigo-500 text-white shadow-sm'
                  : 'bg-white text-slate-500 border border-slate-200 active:bg-slate-50'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category filter */}
      <div>
        <p className="text-sm text-slate-400 mb-2">カテゴリ</p>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button onClick={() => setCategoryFilter('all')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              categoryFilter === 'all' ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-500 border-slate-200 active:bg-slate-50'
            }`}>
            すべて
          </button>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setCategoryFilter(cat.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                categoryFilter === cat.id ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-500 border-slate-200 active:bg-slate-50'
              }`}>
              <span className={`w-2 h-2 rounded-full ${cat.color}`} />
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-52 text-slate-400 space-y-2">
          <span className="text-4xl">🎉</span>
          <p className="text-center">
            {pending.length === 0 ? '全タスク完了！お疲れ様でした' : 'この条件ではタスクがありません'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* おすすめタスク */}
          <div
            className="bg-white rounded-2xl p-5 border border-indigo-100 shadow-sm cursor-pointer"
            onClick={() => {
              if (editingId === suggested.id) return
              setExpandedId(expandedId === suggested.id ? null : suggested.id)
            }}
          >
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wide">おすすめ</p>
              <button
                onClick={e => { e.stopPropagation(); startEdit(suggested) }}
                className="text-slate-300 active:text-indigo-400 text-sm px-1"
              >✏️</button>
            </div>

            {editingId === suggested.id ? (
              <div className="space-y-3" onClick={e => e.stopPropagation()}>
                <input autoFocus className="w-full bg-slate-50 border border-indigo-300 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none text-sm" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                <div>
                  <p className="text-xs text-slate-400 mb-1">カテゴリ</p>
                  <div className="flex gap-2 flex-wrap">
                    {categories.map(c => (
                      <button key={c.id} onClick={() => setEditCategoryId(c.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${editCategoryId === c.id ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-500 border-slate-200'}`}>
                        <span className={`w-2 h-2 rounded-full ${c.color}`} />{c.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">概算時間</p>
                  <div className="flex gap-1">
                    {TIMES.map(t => (
                      <button key={t} onClick={() => setEditTime(t)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium border ${editTime === t ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-slate-400 border-slate-200'}`}>
                        {TIME_LABELS[t]}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">締め切り</p>
                  <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 focus:outline-none [color-scheme:light]" value={editDeadline} onChange={e => setEditDeadline(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingId(null)} className="flex-1 py-2 rounded-xl text-sm border border-slate-200 text-slate-500">キャンセル</button>
                  <button onClick={() => saveEdit(suggested)} className="flex-1 py-2 rounded-xl text-sm bg-indigo-500 text-white font-medium">保存</button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold text-slate-800 mb-3 leading-snug">{suggested.title}</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  <CategoryBadge category={categories.find(c => c.id === suggested.categoryId)} />
                  <TimeChip time={suggested.estimatedTime} />
                  {suggested.deadline && (
                    <span className={`text-sm font-medium ${isOverdue(suggested.deadline) ? 'text-rose-500' : isToday(parseISO(suggested.deadline)) ? 'text-amber-500' : 'text-slate-400'}`}>
                      〆{format(parseISO(suggested.deadline), 'M/d(E)', { locale: ja })}
                    </span>
                  )}
                </div>

                {suggested.subtasks.length > 0 && (
                  <div className="bg-slate-50 rounded-xl p-3 mb-4 space-y-1.5">
                    <p className="text-xs text-slate-400 mb-1">サブタスク</p>
                    {suggested.subtasks.map(s => (
                      <div key={s.id} className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => toggleSubtask(suggested, s.id)}
                          className={`w-4 h-4 rounded border flex-shrink-0 transition-colors ${s.completed ? 'bg-emerald-400 border-emerald-400' : 'border-slate-300 bg-white'}`}>
                          {s.completed && <span className="text-[10px] text-white flex items-center justify-center w-full h-full">✓</span>}
                        </button>
                        <span className={`text-sm flex-1 ${s.completed ? 'line-through text-slate-400' : 'text-slate-600'}`}>{s.title}</span>
                        {s.deadline && <span className={`text-xs ${isOverdue(s.deadline) ? 'text-rose-400' : 'text-slate-400'}`}>〆{s.deadline.slice(5).replace('-','/')}</span>}
                        <TimeChip time={s.estimatedTime} small />
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={e => { e.stopPropagation(); onComplete(suggested.id) }}
                  className="w-full bg-emerald-400 active:bg-emerald-500 text-white font-bold py-3.5 rounded-xl text-base shadow-sm">
                  完了 ✓
                </button>
              </>
            )}
          </div>

          {/* 他のタスク（〆切近い順） */}
          {sorted.length > 1 && (
            <div>
              <p className="text-sm text-slate-400 mb-2">他のタスク ({sorted.length - 1}件)</p>
              <div className="space-y-2">
                {sorted.slice(1).map(task => renderTaskRow(task))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
