import { Category } from '../types'

interface Props {
  category: Category | undefined
  small?: boolean
}

export default function CategoryBadge({ category, small }: Props) {
  if (!category) return (
    <span className={`inline-flex items-center gap-1 ${small ? 'text-xs' : 'text-sm'}`}>
      <span className={`inline-block rounded-full ${small ? 'w-2 h-2' : 'w-2.5 h-2.5'} bg-slate-300`} />
      <span className="text-slate-400">未分類</span>
    </span>
  )
  return (
    <span className={`inline-flex items-center gap-1 ${small ? 'text-xs' : 'text-sm'}`}>
      <span className={`inline-block rounded-full ${small ? 'w-2 h-2' : 'w-2.5 h-2.5'} ${category.color}`} />
      <span className="text-slate-500">{category.name}</span>
    </span>
  )
}
