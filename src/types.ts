export type EstimatedTime = '10' | '30' | '60' | '60+'

export interface SubTask {
  id: string
  title: string
  estimatedTime: EstimatedTime
  deadline: string | null
  completed: boolean
}

export interface Task {
  id: string
  title: string
  categoryId: string
  deadline: string | null   // ISO date string (YYYY-MM-DD)
  estimatedTime: EstimatedTime
  subtasks: SubTask[]
  completed: boolean
  createdAt: string
}

export interface Category {
  id: string
  name: string
  color: string  // tailwind color class e.g. 'bg-violet-500'
}

export type Screen = 'next' | 'add' | 'today'
