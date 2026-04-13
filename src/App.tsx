import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { useStore } from './store'
import { Screen } from './types'
import BottomNav from './components/BottomNav'
import NextTaskScreen from './screens/NextTaskScreen'
import AddTaskScreen from './screens/AddTaskScreen'
import TodayScreen from './screens/TodayScreen'
import LoginScreen from './screens/LoginScreen'

export default function App() {
  const [screen, setScreen] = useState<Screen>('next')
  const { user, loading, login, logout } = useAuth()
  const store = useStore(user?.uid ?? '')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-300 text-sm">読み込み中...</div>
      </div>
    )
  }

  if (!user) {
    return <LoginScreen onLogin={login} />
  }

  return (
    <div className="flex flex-col h-full bg-indigo-50/60">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 pt-4 pb-1">
        <span className="text-xs text-slate-400">{user.displayName}</span>
        <button onClick={logout} className="text-xs text-slate-400 active:text-slate-600">
          ログアウト
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-20">
        {screen === 'next' && (
          <NextTaskScreen
            tasks={store.tasks}
            categories={store.categories}
            onComplete={store.completeTask}
            onUpdate={store.updateTask}
          />
        )}
        {screen === 'add' && (
          <AddTaskScreen
            tasks={store.tasks}
            categories={store.categories}
            onAdd={store.addTask}
            onAddCategory={store.addCategory}
            onDeleteCategory={store.deleteCategory}
          />
        )}
        {screen === 'today' && (
          <TodayScreen
            tasks={store.tasks}
            categories={store.categories}
            onComplete={store.completeTask}
            onDelete={store.deleteTask}
            onUpdate={store.updateTask}
          />
        )}
      </div>
      <BottomNav current={screen} onChange={setScreen} />
    </div>
  )
}
