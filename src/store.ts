import { useState, useEffect } from 'react'
import { Category, Task } from './types'

const TASKS_KEY = 'mytodo_tasks'
const CATEGORIES_KEY = 'mytodo_categories'

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'private',  name: 'プライベート', color: 'bg-emerald-500' },
  { id: 'work1',    name: '仕事A',        color: 'bg-blue-500' },
  { id: 'work2',    name: '仕事B',        color: 'bg-orange-500' },
]

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function save<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function useStore() {
  const [tasks, setTasksRaw] = useState<Task[]>(() => load(TASKS_KEY, []))
  const [categories, setCategoriesRaw] = useState<Category[]>(() =>
    load(CATEGORIES_KEY, DEFAULT_CATEGORIES)
  )

  const setTasks = (t: Task[] | ((prev: Task[]) => Task[])) => {
    setTasksRaw(prev => {
      const next = typeof t === 'function' ? t(prev) : t
      save(TASKS_KEY, next)
      return next
    })
  }

  const setCategories = (c: Category[] | ((prev: Category[]) => Category[])) => {
    setCategoriesRaw(prev => {
      const next = typeof c === 'function' ? c(prev) : c
      save(CATEGORIES_KEY, next)
      return next
    })
  }

  const addTask = (task: Task) => setTasks(prev => [task, ...prev])

  const updateTask = (updated: Task) =>
    setTasks(prev => prev.map(t => (t.id === updated.id ? updated : t)))

  const deleteTask = (id: string) =>
    setTasks(prev => prev.filter(t => t.id !== id))

  const completeTask = (id: string) =>
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: true } : t))

  const addCategory = (cat: Category) => setCategories(prev => [...prev, cat])

  const deleteCategory = (id: string) => setCategories(prev => prev.filter(c => c.id !== id))

  return {
    tasks,
    categories,
    addTask,
    updateTask,
    deleteTask,
    completeTask,
    addCategory,
    deleteCategory,
  }
}
