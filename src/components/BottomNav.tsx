import { Screen } from '../types'

interface Props {
  current: Screen
  onChange: (s: Screen) => void
}

const items: { id: Screen; label: string; icon: string }[] = [
  { id: 'next',  label: '次のタスク', icon: '⚡' },
  { id: 'add',   label: '追加',       icon: '＋' },
  { id: 'today', label: '今日',       icon: '📋' },
]

export default function BottomNav({ current, onChange }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex shadow-[0_-1px_8px_rgba(0,0,0,0.06)]">
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors ${
            current === item.id
              ? 'text-indigo-500'
              : 'text-slate-400 active:text-slate-600'
          }`}
        >
          <span className="text-xl leading-none">{item.icon}</span>
          <span className="text-[11px] font-medium">{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
