import { EstimatedTime } from '../types'

const labels: Record<EstimatedTime, string> = {
  '10':  '10分',
  '30':  '30分',
  '60':  '60分',
  '60+': '60分以上',
}

const colors: Record<EstimatedTime, string> = {
  '10':  'bg-teal-100 text-teal-700',
  '30':  'bg-blue-100 text-blue-700',
  '60':  'bg-violet-100 text-violet-700',
  '60+': 'bg-rose-100 text-rose-600',
}

interface Props {
  time: EstimatedTime
  small?: boolean
}

export default function TimeChip({ time, small }: Props) {
  return (
    <span className={`rounded-full font-medium ${small ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1'} ${colors[time]}`}>
      {labels[time]}
    </span>
  )
}
