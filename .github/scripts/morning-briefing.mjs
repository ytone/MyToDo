import { google } from 'googleapis'

const SLACK_WEBHOOK_URL       = process.env.SLACK_WEBHOOK_URL
const FIREBASE_PROJECT_ID     = process.env.FIREBASE_PROJECT_ID
const FIREBASE_USER_UID       = process.env.FIREBASE_USER_UID
const GOOGLE_CREDENTIALS      = JSON.parse(process.env.GOOGLE_CALENDAR_CREDENTIALS)
const CALENDAR_IDS            = process.env.CALENDAR_IDS
  ? process.env.CALENDAR_IDS.split(',').map(s => s.trim())
  : []

// ─── 日付ユーティリティ ──────────────────────────────
const jstNow = new Date(Date.now() + 9 * 60 * 60 * 1000)
const yyyy   = jstNow.getUTCFullYear()
const mm     = String(jstNow.getUTCMonth() + 1).padStart(2, '0')
const dd     = String(jstNow.getUTCDate()).padStart(2, '0')
const dateLabel = `${parseInt(mm)}/${parseInt(dd)}`
const todayMin  = `${yyyy}-${mm}-${dd}T00:00:00+09:00`
const todayMax  = `${yyyy}-${mm}-${dd}T23:59:59+09:00`

// ─── Google Auth（共通）──────────────────────────────
async function getAuthClient(scopes) {
  const auth = new google.auth.GoogleAuth({ credentials: GOOGLE_CREDENTIALS, scopes })
  return auth
}

// ─── Google Calendar ─────────────────────────────────
async function getCalendarEvents() {
  const auth = await getAuthClient(['https://www.googleapis.com/auth/calendar.readonly'])
  const calendar = google.calendar({ version: 'v3', auth })

  const allEvents = []
  for (const calendarId of CALENDAR_IDS) {
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

  allEvents.sort((a, b) => {
    const aTime = a.start?.dateTime || a.start?.date || ''
    const bTime = b.start?.dateTime || b.start?.date || ''
    return aTime.localeCompare(bTime)
  })

  return allEvents
}

// ─── Firestore タスク取得（OAuth2 認証でセキュリティルールをバイパス）────
async function getTasks() {
  const auth = await getAuthClient(['https://www.googleapis.com/auth/datastore'])
  const accessToken = await auth.getAccessToken()

  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${FIREBASE_USER_UID}/tasks?pageSize=100`
  const res  = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  })
  const data = await res.json()

  if (!data.documents) {
    console.error('Firestore response:', JSON.stringify(data))
    return []
  }

  return data.documents
    .map(doc => {
      const f = doc.fields || {}
      return {
        title:         f.title?.stringValue        || '',
        estimatedTime: f.estimatedTime?.stringValue || '',
        deadline:      f.deadline?.stringValue       || null,
        completed:     f.completed?.booleanValue     || false,
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
  const dt  = new Date(event.start?.dateTime)
  const jst = new Date(dt.getTime() + 9 * 60 * 60 * 1000)
  const h   = String(jst.getUTCHours()).padStart(2, '0')
  const m   = String(jst.getUTCMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

// ─── メイン ──────────────────────────────────────────
async function main() {
  const [events, tasks] = await Promise.all([getCalendarEvents(), getTasks()])

  // カレンダーブロック
  const calLines = events.length > 0
    ? events.map(e => {
        const prefix = (e.summary || '').startsWith('移動') ? '🚃' : '•'
        return `${prefix} ${formatTime(e)} ${e.summary || '（タイトルなし）'}`
      }).join('\n')
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

  // タイムドイベント（dateTimeあり）をJST時刻でパース
  const timedEvents = events
    .filter(e => e.start?.dateTime && e.end?.dateTime)
    .map(e => ({
      summary:     e.summary || '（タイトルなし）',
      location:    e.location || null,
      description: e.description || null,
      start:       new Date(e.start.dateTime),
      end:         new Date(e.end.dateTime),
    }))

  // ─── お昼ご飯の提案 ──────────────────────────────────
  // カレンダーに昼食・ランチが既に入っているか確認（タイトルに含む場合も含む）
  const lunchKeywords = ['昼食', 'ランチ', 'lunch', 'Lunch', 'LUNCH', '昼ご飯', '昼めし']
  const hasLunchEvent = events.some(e =>
    lunchKeywords.some(kw => (e.summary || '').includes(kw))
  )

  let lunchSuggestion = null
  if (hasLunchEvent) {
    // 昼食がカレンダーに入っている場合は提案しない
    lunchSuggestion = null
  } else {
    // 空き時間を探す（30分刻み、端点を重複なく判定）
    const lunchSlots = ['11:00','11:30','12:00','12:30','13:00','13:30']
    for (const slot of lunchSlots) {
      const [h, m] = slot.split(':').map(Number)
      const slotStart = new Date(`${yyyy}-${mm}-${dd}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00+09:00`)
      const slotEnd   = new Date(slotStart.getTime() + 30 * 60 * 1000)
      // 端点は除く（開始時刻ぴったりに終わるイベントは競合しない）
      const conflict = timedEvents.some(e => e.start < slotEnd && e.end > slotStart)
      if (!conflict) {
        lunchSuggestion = `🍱 ランチは *${slot}〜* が空いています。`
        break
      }
    }
    if (!lunchSuggestion) {
      lunchSuggestion = '🍱 ランチタイムの空きがないので、予定の合間に食べましょう。'
    }
  }

  // ─── 移動情報 ────────────────────────────────────────
  function parseTravelEvent(e) {
    const time      = formatTime({ start: { dateTime: e.start.toISOString() } })
    const desc      = e.description || ''
    const arrival   = desc.match(/発着時間[：:]\s*([^\n]+)/)
    const duration  = desc.match(/所要時間[：:]\s*([^\n]+)/)
    const transfers = desc.match(/乗換回数[：:]\s*([^\n]+)/)
    const cost      = desc.match(/総額[：:]\s*([^\n]+)/)

    const details = [
      arrival   ? arrival[1].trim() : null,
      duration  ? `所要${duration[1].trim()}` : null,
      transfers ? `乗換${transfers[1].trim()}` : null,
      cost      ? cost[1].trim() : null,
    ].filter(Boolean).join(' ／ ')

    return details
      ? `🚃 ${time} ${e.summary}\n　　${details}`
      : `🚃 ${time} ${e.summary}`
  }

  function parseLocationEvent(e) {
    const time = formatTime({ start: { dateTime: e.start.toISOString() } })
    return `📍 ${time} 「${e.summary}」に向けて移動が必要です（${e.location}）`
  }

  const travelLines = timedEvents
    .filter(e => e.summary.startsWith('移動') || e.location)
    .map(e => e.summary.startsWith('移動') ? parseTravelEvent(e) : parseLocationEvent(e))

  const travelInfo = travelLines.length > 0 ? travelLines.join('\n') : null

  // ─── アドバイス本文 ──────────────────────────────────
  const urgentTask = tasks.find(t => urgencyIcon(t.deadline) === '🔴')

  const scheduleLines = timedEvents.length > 0
    ? timedEvents.map(e => `• ${formatTime({ start: { dateTime: e.start.toISOString() } })} ${e.summary}`).join('\n')
    : '• 今日は予定なし'

  const adviceParts = [scheduleLines]

  if (urgentTask) {
    adviceParts.push(`🔴 まず「${urgentTask.title}」を最優先で片付けましょう。`)
  } else if (timedEvents.length === 0) {
    adviceParts.push('今日は予定がなく、集中できる一日です。計画的に進めていきましょう。')
  } else {
    adviceParts.push('隙間時間を活用して進めていきましょう。')
  }

  if (lunchSuggestion) {
    adviceParts.push(lunchSuggestion)
  }

  const advice = adviceParts.join('\n')

  const travelSection = travelInfo
    ? `\n*🚃 今日の移動*\n${travelInfo}\n`
    : ''

  const message = `おはようございます、裕太さん！☀️
${travelSection}
*✅ タスク（緊急順）*
${taskLines}

*🤔 Claudeの提案*
${advice}

今日もいい一日を！💪`

  const slackRes = await fetch(SLACK_WEBHOOK_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ text: message }),
  })

  if (!slackRes.ok) {
    throw new Error(`Slack送信失敗: ${slackRes.status} ${await slackRes.text()}`)
  }
  console.log('✅ 送信完了')
}

main().catch(e => { console.error(e); process.exit(1) })
