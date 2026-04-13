import { useState } from 'react'
import { Category, EstimatedTime, Task } from '../types'
import CategoryBadge from '../components/CategoryBadge'
import TimeChip from '../components/TimeChip'
import { format, parseISO, differenceInDays } from 'date-fns'
import { ja } from 'date-fns/locale'

interface Props {
  tasks: Task[]
  categories: Category[]
  onComplete: (id: string) => void
}

type TimeFilter = EstimatedTime | 'any'

const FILTERS: { id: TimeFilter; label: string }[] = [
  { id: 'any', label: 'すべて' },
  { id: '10',  label: '10分' },
  { id: '30',  label: '30分' },
  { id: '60',  label: '60分' },
  { id: '60+', label: '60分以上' },
]

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

export default function NextTaskScreen({ tasks, categories, onComplete }: Props) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('any')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const pending = tasks.filter(t => !t.completed)

  const filtered = pending.filter(t => {
    const timeOk = timeFilter === 'any' || t.estimatedTime === timeFilter
    const catOk = categoryFilter === 'all' || t.categoryId === categoryFilter
    return timeOk && catOk
  })

  const sorted = [...filtered].sort((a, b) => urgencyScore(b) - urgencyScore(a))
  const suggested = sorted[0]

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
              categoryFilter === 'all'
                ? 'bg-slate-700 text-white border-slate-700'
                : 'bg-white text-slate-500 border-slate-200 active:bg-slate-50'
            }`}>
            すべて
          </button>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setCategoryFilter(cat.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                categoryFilter === cat.id
                  ? 'bg-slate-700 text-white border-slate-700'
                  : 'bg-white text-slate-500 border-slate-200 active:bg-slate-50'
              }`}>
              <span className={`w-2 h-2 rounded-full ${cat.color}`} />
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Suggested task */}
      {suggested ? (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-indigo-100 shadow-sm">
            <p className="text-xs text-indigo-400 font-semibold mb-2 uppercase tracking-wide">おすすめ</p>
            <h3 className="text-lg font-bold text-slate-800 mb-3 leading-snug">{suggested.title}</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              <CategoryBadge category={categories.find(c => c.id === suggested.categoryId)} />
              <TimeChip time={suggested.estimatedTime} />
              {suggested.deadline && (
                <span className="text-sm text-slate-400">
                  〆{format(parseISO(suggested.deadline), 'M/d(E)', { locale: ja })}
                </span>
              )}
            </div>

            {suggested.subtasks.length > 0 && (
              <div className="bg-slate-50 rounded-xl p-3 mb-4 space-y-1.5">
                <p className="text-xs text-slate-400 mb-1">サブタスク</p>
                {suggested.subtasks.map(s => (
                  <div key={s.id} className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.completed ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                    <span className={`text-sm flex-1 ${s.completed ? 'line-through text-slate-400' : 'text-slate-600'}`}>{s.title}</span>
                    <TimeChip time={s.estimatedTime} small />
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => onComplete(suggested.id)}
              className="w-full bg-emerald-400 active:bg-emerald-500 text-white font-bold py-3.5 rounded-xl text-base shadow-sm">
              完了 ✓
            </button>
          </div>

          {/* Rest of tasks */}
          {sorted.length > 1 && (
            <div>
              <p className="text-sm text-slate-400 mb-2">他のタスク ({sorted.length - 1}件)</p>
              <div className="space-y-2">
                {sorted.slice(1).map(task => (
                  <div key={task.id} className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 border border-slate-100 shadow-sm">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 truncate">{task.title}</p>
                      <div className="flex gap-2 mt-1">
                        <CategoryBadge category={categories.find(c => c.id === task.categoryId)} small />
                        <TimeChip time={task.estimatedTime} small />
                      </div>
                    </div>
                    <button onClick={() => onComplete(task.id)}
                      className="flex-shrink-0 w-8 h-8 rounded-full border-2 border-slate-200 active:border-emerald-400 active:bg-emerald-50 transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-52 text-slate-400 space-y-2">
          <span className="text-4xl">🎉</span>
          <p className="text-center">
            {pending.length === 0
              ? '全タスク完了！お疲れ様でした'
              : 'この条件ではタスクがありません'}
          </p>
        </div>
      )}
    </div>
  )
}
