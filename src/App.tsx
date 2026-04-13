import { useState } from 'react'
import { useStore } from './store'
import { Screen } from './types'
import BottomNav from './components/BottomNav'
import NextTaskScreen from './screens/NextTaskScreen'
import AddTaskScreen from './screens/AddTaskScreen'
import TodayScreen from './screens/TodayScreen'

export default function App() {
  const [screen, setScreen] = useState<Screen>('next')
  const store = useStore()

  return (
    <div className="flex flex-col h-full bg-indigo-50/60">
      <div className="flex-1 overflow-y-auto pb-20">
        {screen === 'next' && (
          <NextTaskScreen
            tasks={store.tasks}
            categories={store.categories}
            onComplete={store.completeTask}
          />
        )}
        {screen === 'add' && (
          <AddTaskScreen
            categories={store.categories}
            onAdd={store.addTask}
            onAddCategory={store.addCategory}
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
