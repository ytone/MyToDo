import { google } from 'googleapis'

const SLACK_WEBHOOK_URL       = process.env.SLACK_WEBHOOK_URL
const FIREBASE_API_KEY        = process.env.FIREBASE_API_KEY
const FIREBASE_PROJECT_ID     = process.env.FIREBASE_PROJECT_ID
const FIREBASE_USER_UID       = process.env.FIREBASE_USER_UID
const GOOGLE_CREDENTIALS      = JSON.parse(process.env.GOOGLE_CALENDAR_CREDENTIALS)

// ─── 日付ユーティリティ ──────────────────────────────
const jstNow = new Date(Date.now() + 9 * 60 * 60 * 1000)
const yyyy   = jstNow.getUTCFullYear()
const mm     = String(jstNow.getUTCMonth() + 1).padStart(2, '0')
const dd     = String(jstNow.getUTCDate()).padStart(2, '0')
const dateLabel = `${parseInt(mm)}/${parseInt(dd)}`
const todayMin  = `${yyyy}-${mm}-${dd}T00:00:00+09:00`
const todayMax  = `${yyyy}-${mm}-${dd}T23:59:59+09:00`

// ─── Google Calendar ─────────────────────────────────
async function getCalendarEvents() {
  const auth = new google.auth.GoogleAuth({
    credentials: GOOGLE_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  })
  const calendar = google.calendar({ version: 'v3', auth })

  const calendarIds = [
    'CALENDAR_ID_1',
    'CALENDAR_ID_2',
  ]

  const allEvents = []
  for (const calendarId of calendarIds) {
    try {
      const res = await calendar.events.list({
        calendarId,
        timeMin: todayMin,
        timeMax: todayMax,
        singleEvents: true,
        orderBy: 'startTime',
      })
      allEvents.push(...(res.data.items || []))
    } catch (e) {
      console.error(`Calendar fetch error (${calendarId}):`, e.message)
    }
  }

  // 時刻順にソート
  allEvents.sort((a, b) => {
    const aTime = a.start?.dateTime || a.start?.date || ''
    const bTime = b.start?.dateTime || b.start?.date || ''
    return aTime.localeCompare(bTime)
  })

  return allEvents
}

// ─── Firestore タスク取得 ────────────────────────────
async function getTasks() {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${FIREBASE_USER_UID}/tasks?key=${FIREBASE_API_KEY}&pageSize=50`
  const res  = await fetch(url)
  const data = await res.json()

  if (!data.documents) return []

  return data.documents
    .map(doc => {
      const f = doc.fields || {}
      return {
        title:         f.title?.stringValue       || '',
        estimatedTime: f.estimatedTime?.stringValue || '',
        deadline:      f.deadline?.stringValue      || null,
        completed:     f.completed?.booleanValue    || false,
      }
    })
    .filter(t => !t.completed)
    .sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0
      if (!a.deadline) return 1
      if (!b.deadline) return -1
      return a.deadline.localeCompare(b.deadline)
    })
}

// ─── 緊急度アイコン ──────────────────────────────────
function urgencyIcon(deadline) {
  if (!deadline) return '⚪'
  const today = new Date(`${yyyy}-${mm}-${dd}`)
  const due   = new Date(deadline)
  const diff  = Math.floor((due - today) / (1000 * 60 * 60 * 24))
  if (diff <= 1) return '🔴'
  if (diff <= 7) return '🟡'
  return '⚪'
}

// ─── 時刻フォーマット ────────────────────────────────
function formatTime(event) {
  if (event.start?.date) return '終日'
  const dt = new Date(event.start?.dateTime)
  const h  = String(dt.getHours()).padStart(2, '0')
  const m  = String(dt.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

// ─── メイン ──────────────────────────────────────────
async function main() {
  const [events, tasks] = await Promise.all([getCalendarEvents(), getTasks()])

  // カレンダーブロック
  const calLines = events.length > 0
    ? events.map(e => `• ${formatTime(e)} ${e.summary || '（タイトルなし）'}`).join('\n')
    : '• 今日は予定なし'

  // タスクブロック
  const taskLines = tasks.length > 0
    ? tasks.map(t => {
        const icon     = urgencyIcon(t.deadline)
        const deadline = t.deadline ? ` ← ${t.deadline.slice(5).replace('-', '/')}締切` : ''
        const time     = t.estimatedTime ? `（${t.estimatedTime}分）` : ''
        return `• ${icon} ${t.title}${time}${deadline}`
      }).join('\n')
    : '• タスクなし 🎉'

  // 空き時間の分析（簡易）
  const busyHours = events
    .filter(e => e.start?.dateTime)
    .map(e => `${formatTime(e)} ${e.summary}`)
    .join('、')
  const adviceBase = busyHours
    ? `今日は ${busyHours} の予定があります。`
    : '今日は会議がなく、集中できる一日です。'
  const urgentTask = tasks.find(t => urgencyIcon(t.deadline) === '🔴')
  const advice = urgentTask
    ? `${adviceBase} まず「${urgentTask.title}」を最優先で片付けましょう。`
    : `${adviceBase} 計画的に進めていきましょう。`

  const message = `おはようございます、裕太さん！☀️

*📅 今日のスケジュール（${dateLabel}）*
${calLines}

*✅ タスク（緊急順）*
${taskLines}

*🤔 Claudeの提案*
${advice}

今日もいい一日を！💪`

  // Slack送信
  const res = await fetch(SLACK_WEBHOOK_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ text: message }),
  })

  if (!res.ok) {
    throw new Error(`Slack送信失敗: ${res.status} ${await res.text()}`)
  }
  console.log('✅ 送信完了')
}

main().catch(e => { console.error(e); process.exit(1) })
