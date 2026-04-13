import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import { Category, EstimatedTime, SubTask, Task } from '../types'

interface Props {
  categories: Category[]
  onAdd: (task: Task) => void
  onAddCategory: (cat: Category) => void
}

const TIMES: EstimatedTime[] = ['10', '30', '60', '60+']
const TIME_LABELS: Record<EstimatedTime, string> = {
  '10': '10分', '30': '30分', '60': '60分', '60+': '60分以上',
}

const COLORS = [
  'bg-blue-400', 'bg-emerald-400', 'bg-orange-400',
  'bg-rose-400', 'bg-violet-400', 'bg-yellow-400', 'bg-teal-400',
]

export default function AddTaskScreen({ categories, onAdd, onAddCategory }: Props) {
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '')
  const [deadline, setDeadline] = useState('')
  const [estimatedTime, setEstimatedTime] = useState<EstimatedTime>('30')
  const [subtasks, setSubtasks] = useState<SubTask[]>([])
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [newSubtaskTime, setNewSubtaskTime] = useState<EstimatedTime>('30')
  const [showCatForm, setShowCatForm] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState(COLORS[0])
  const [saved, setSaved] = useState(false)

  const addSubtask = () => {
    if (!newSubtaskTitle.trim()) return
    setSubtasks(prev => [...prev, {
      id: uuid(), title: newSubtaskTitle.trim(),
      estimatedTime: newSubtaskTime, completed: false,
    }])
    setNewSubtaskTitle('')
  }

  const removeSubtask = (id: string) => setSubtasks(prev => prev.filter(s => s.id !== id))

  const handleSubmit = () => {
    if (!title.trim()) return
    onAdd({
      id: uuid(),
      title: title.trim(),
      categoryId,
      deadline: deadline || null,
      estimatedTime,
      subtasks,
      completed: false,
      createdAt: new Date().toISOString(),
    })
    setTitle('')
    setDeadline('')
    setEstimatedTime('30')
    setSubtasks([])
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const handleAddCategory = () => {
    if (!newCatName.trim()) return
    const cat: Category = { id: uuid(), name: newCatName.trim(), color: newCatColor }
    onAddCategory(cat)
    setCategoryId(cat.id)
    setNewCatName('')
    setShowCatForm(false)
  }

  return (
    <div className="p-4 space-y-5">
      <h2 className="text-xl font-bold text-slate-700">タスクを追加</h2>

      {/* Title */}
      <div>
        <label className="block text-sm text-slate-400 mb-1">タスク名 *</label>
        <input
          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm"
          placeholder="何をする？"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
      </div>

      {/* Category */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm text-slate-400">カテゴリ</label>
          <button onClick={() => setShowCatForm(v => !v)} className="text-xs text-indigo-400 active:text-indigo-500">
            {showCatForm ? 'キャンセル' : '+ 新規'}
          </button>
        </div>
        {showCatForm && (
          <div className="bg-white border border-slate-200 rounded-xl p-3 mb-2 space-y-2 shadow-sm">
            <input
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder-slate-300 focus:outline-none"
              placeholder="カテゴリ名"
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
            />
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} onClick={() => setNewCatColor(c)}
                  className={`w-6 h-6 rounded-full ${c} ${newCatColor === c ? 'ring-2 ring-slate-400 ring-offset-1 ring-offset-white' : ''}`} />
              ))}
            </div>
            <button onClick={handleAddCategory}
              className="w-full bg-indigo-500 active:bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium">
              追加
            </button>
          </div>
        )}
        <div className="flex gap-2 flex-wrap">
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setCategoryId(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                categoryId === cat.id
                  ? 'bg-slate-700 text-white border-slate-700'
                  : 'bg-white text-slate-500 border-slate-200 active:bg-slate-50'
              }`}>
              <span className={`w-2 h-2 rounded-full ${cat.color}`} />
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Deadline */}
      <div>
        <label className="block text-sm text-slate-400 mb-1">締め切り（任意）</label>
        <input
          type="date"
          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm [color-scheme:light]"
          value={deadline}
          onChange={e => setDeadline(e.target.value)}
        />
      </div>

      {/* Estimated time */}
      <div>
        <label className="block text-sm text-slate-400 mb-1">概算所要時間</label>
        <div className="grid grid-cols-4 gap-2">
          {TIMES.map(t => (
            <button key={t} onClick={() => setEstimatedTime(t)}
              className={`py-2 rounded-xl text-sm font-medium border transition-colors ${
                estimatedTime === t
                  ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm'
                  : 'bg-white text-slate-500 border-slate-200 active:bg-slate-50'
              }`}>
              {TIME_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Subtasks (shown when 60+) */}
      {estimatedTime === '60+' && (
        <div>
          <label className="block text-sm text-slate-400 mb-1">サブタスク（60分以上は分割推奨）</label>
          <div className="space-y-2 mb-2">
            {subtasks.map(s => (
              <div key={s.id} className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
                <span className="flex-1 text-sm text-slate-700">{s.title}</span>
                <span className="text-xs text-slate-400">{TIME_LABELS[s.estimatedTime]}</span>
                <button onClick={() => removeSubtask(s.id)} className="text-slate-300 active:text-rose-400 text-lg leading-none">×</button>
              </div>
            ))}
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 shadow-sm">
            <input
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder-slate-300 focus:outline-none"
              placeholder="サブタスク名"
              value={newSubtaskTitle}
              onChange={e => setNewSubtaskTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSubtask()}
            />
            <div className="flex gap-2">
              {(['10', '30', '60'] as EstimatedTime[]).map(t => (
                <button key={t} onClick={() => setNewSubtaskTime(t)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border ${
                    newSubtaskTime === t
                      ? 'bg-indigo-500 text-white border-indigo-500'
                      : 'bg-slate-50 text-slate-500 border-slate-200'
                  }`}>
                  {TIME_LABELS[t]}
                </button>
              ))}
            </div>
            <button onClick={addSubtask}
              className="w-full bg-slate-100 active:bg-slate-200 text-slate-600 rounded-lg py-2 text-sm font-medium border border-slate-200">
              + サブタスク追加
            </button>
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!title.trim()}
        className={`w-full py-4 rounded-2xl text-base font-bold transition-all shadow-sm ${
          saved
            ? 'bg-emerald-400 text-white'
            : title.trim()
              ? 'bg-indigo-500 active:bg-indigo-600 text-white'
              : 'bg-slate-100 text-slate-300 border border-slate-200'
        }`}>
        {saved ? '✓ 追加しました' : 'タスクを追加'}
      </button>
    </div>
  )
}
