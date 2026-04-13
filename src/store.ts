import { useState, useEffect } from 'react'
import {
  collection, doc, onSnapshot,
  addDoc, updateDoc, deleteDoc, setDoc, query, orderBy
} from 'firebase/firestore'
import { db } from './firebase'
import { Category, Task } from './types'

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'private',  name: 'プライベート', color: 'bg-emerald-500' },
  { id: 'work1',    name: '仕事A',        color: 'bg-blue-500' },
  { id: 'work2',    name: '仕事B',        color: 'bg-orange-500' },
]

export function useStore(userId: string) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [ready, setReady] = useState(false)

  const tasksRef = collection(db, 'users', userId, 'tasks')
  const catsRef  = collection(db, 'users', userId, 'categories')

  // タスク購読
  useEffect(() => {
    const q = query(tasksRef, orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)))
    })
    return unsub
  }, [userId])

  // カテゴリ購読 & 初期データ投入
  useEffect(() => {
    const unsub = onSnapshot(catsRef, async snap => {
      if (snap.empty) {
        // 初回ログイン時にデフォルトカテゴリを作成
        for (const cat of DEFAULT_CATEGORIES) {
          await setDoc(doc(catsRef, cat.id), { name: cat.name, color: cat.color })
        }
      } else {
        setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Category)))
        setReady(true)
      }
    })
    return unsub
  }, [userId])

  const addTask = async (task: Task) => {
    const { id, ...data } = task
    await addDoc(tasksRef, data)
  }

  const updateTask = async (task: Task) => {
    const { id, ...data } = task
    await updateDoc(doc(tasksRef, id), data as Record<string, unknown>)
  }

  const deleteTask = async (id: string) => {
    await deleteDoc(doc(tasksRef, id))
  }

  const completeTask = async (id: string) => {
    await updateDoc(doc(tasksRef, id), { completed: true })
  }

  const addCategory = async (cat: Category) => {
    const { id, ...data } = cat
    await setDoc(doc(catsRef, id), data)
  }

  const deleteCategory = async (id: string) => {
    await deleteDoc(doc(catsRef, id))
  }

  return { tasks, categories, ready, addTask, updateTask, deleteTask, completeTask, addCategory, deleteCategory }
}
