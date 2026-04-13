interface Props {
  onLogin: () => void
}

export default function LoginScreen({ onLogin }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 p-8">
      <div className="text-center space-y-2">
        <div className="text-6xl mb-4">📋</div>
        <h1 className="text-2xl font-bold text-slate-700">MyToDo</h1>
        <p className="text-slate-400 text-sm">自分専用タスク管理</p>
      </div>

      <button
        onClick={onLogin}
        className="flex items-center gap-3 bg-white border border-slate-200 shadow-sm rounded-2xl px-6 py-4 text-slate-700 font-medium active:bg-slate-50 transition-colors w-full max-w-xs justify-center">
        <svg width="20" height="20" viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-8.9 20-20 0-1.3-.1-2.7-.4-4z"/>
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4c-7.7 0-14.3 4.4-17.7 10.7z"/>
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5.1l-6.2-5.2C29.4 35.5 26.8 36 24 36c-5.2 0-9.6-2.9-11.8-7.1l-6.5 5C9.5 39.5 16.3 44 24 44z"/>
          <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.6 4.6-4.8 6l6.2 5.2C40.2 35.8 44 30.3 44 24c0-1.3-.1-2.7-.4-4z"/>
        </svg>
        Googleでログイン
      </button>

      <p className="text-xs text-slate-300 text-center">
        ログインするとスマホ・PCで<br />データが同期されます
      </p>
    </div>
  )
}
