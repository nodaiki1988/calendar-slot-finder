import type { AvailableSlot } from '../types'

const GOOGLE_CALENDAR_URL = 'https://calendar.google.com/calendar/render'

const OVERLAY_CSS = `
#csf-overlay-container {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 99999;
  font-family: 'Roboto', 'Helvetica', 'Arial', sans-serif;
}
.csf-overlay-panel {
  position: fixed;
  top: 64px;
  right: 16px;
  width: 300px;
  max-height: 500px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}
.csf-overlay-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #1a73e8;
  color: white;
  font-weight: 500;
}
.csf-overlay-close {
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
  padding: 0 4px;
}
.csf-overlay-list {
  overflow-y: auto;
  max-height: 436px;
  padding: 8px;
}
.csf-overlay-slot {
  display: flex;
  flex-direction: column;
  padding: 10px 12px;
  margin: 4px 0;
  background: rgba(52, 168, 83, 0.08);
  border: 1px solid rgba(52, 168, 83, 0.3);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
}
.csf-overlay-slot:hover {
  background: rgba(52, 168, 83, 0.18);
}
.csf-overlay-date {
  font-size: 12px;
  color: #5f6368;
  font-weight: 500;
}
.csf-overlay-time {
  font-size: 14px;
  color: #202124;
  font-weight: 500;
}
`

function injectStyles() {
  if (document.getElementById('csf-styles')) return
  const style = document.createElement('style')
  style.id = 'csf-styles'
  style.textContent = OVERLAY_CSS
  document.head.appendChild(style)
}

injectStyles()

interface OverlayMessage {
  type: 'SHOW_OVERLAY' | 'HIDE_OVERLAY'
  payload?: AvailableSlot[]
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/

function isValidSlot(s: unknown): s is AvailableSlot {
  if (typeof s !== 'object' || s === null) return false
  const obj = s as Record<string, unknown>
  return (
    typeof obj.start === 'string' &&
    typeof obj.end === 'string' &&
    ISO_DATE_RE.test(obj.start) &&
    ISO_DATE_RE.test(obj.end)
  )
}

chrome.runtime.onMessage.addListener(
  (message: unknown, _sender, sendResponse) => {
    try {
      if (typeof message !== 'object' || message === null) {
        sendResponse({ success: false, error: 'Invalid message' })
        return
      }
      const msg = message as OverlayMessage
      if (
        msg.type === 'SHOW_OVERLAY' &&
        Array.isArray(msg.payload) &&
        msg.payload.every(isValidSlot)
      ) {
        showOverlay(msg.payload)
        sendResponse({ success: true })
      } else if (msg.type === 'HIDE_OVERLAY') {
        hideOverlay()
        sendResponse({ success: true })
      } else {
        sendResponse({ success: false, error: 'Unknown message type' })
      }
    } catch (error) {
      console.error('Content script error:', error)
      sendResponse({ success: false, error: 'Internal error' })
    }
  }
)

/**
 * ISO文字列から直接ローカル時刻 "HH:mm" を抽出する
 * new Date()のブラウザローカル変換を避け、元のTZオフセットを尊重
 */
function formatTimeFromISO(iso: string): string {
  const timePart = iso.split('T')[1]
  const [hh, mm] = timePart.split(':')
  return `${hh}:${mm}`
}

/**
 * ISO文字列から直接ローカル日付 "M/D(曜日)" を抽出する
 */
function formatDateFromISO(iso: string): string {
  const days = ['日', '月', '火', '水', '木', '金', '土']
  const datePart = iso.split('T')[0]
  const [year, month, day] = datePart.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${days[d.getUTCDay()]})`
}

function showOverlay(slots: AvailableSlot[]) {
  hideOverlay()

  const container = document.createElement('div')
  container.id = 'csf-overlay-container'

  const panel = document.createElement('div')
  panel.className = 'csf-overlay-panel'

  const header = document.createElement('div')
  header.className = 'csf-overlay-header'
  const headerText = document.createElement('span')
  headerText.textContent = `空き時間（${slots.length}件）`
  const closeBtn = document.createElement('button')
  closeBtn.className = 'csf-overlay-close'
  closeBtn.textContent = '\u00d7'
  closeBtn.addEventListener('click', hideOverlay)
  header.appendChild(headerText)
  header.appendChild(closeBtn)

  const list = document.createElement('div')
  list.className = 'csf-overlay-list'

  for (const slot of slots) {
    const slotEl = document.createElement('div')
    slotEl.className = 'csf-overlay-slot'

    const dateEl = document.createElement('span')
    dateEl.className = 'csf-overlay-date'
    dateEl.textContent = formatDateFromISO(slot.start)

    const timeEl = document.createElement('span')
    timeEl.className = 'csf-overlay-time'
    timeEl.textContent = `${formatTimeFromISO(slot.start)} - ${formatTimeFromISO(slot.end)}`

    slotEl.appendChild(dateEl)
    slotEl.appendChild(timeEl)

    slotEl.addEventListener('click', () => {
      try {
        const startDate = toGCalDate(slot.start)
        const endDate = toGCalDate(slot.end)
        if (!/^\d{8}T\d{6}$/.test(startDate) || !/^\d{8}T\d{6}$/.test(endDate)) {
          console.error('Invalid date format for calendar URL')
          return
        }
        const url = new URL(GOOGLE_CALENDAR_URL)
        url.searchParams.set('action', 'TEMPLATE')
        url.searchParams.set('dates', `${startDate}/${endDate}`)
        window.open(url.toString(), '_blank', 'noopener,noreferrer')
      } catch (error) {
        console.error('Failed to open calendar:', error)
      }
    })

    list.appendChild(slotEl)
  }

  panel.appendChild(header)
  panel.appendChild(list)
  container.appendChild(panel)
  document.body.appendChild(container)
}

function hideOverlay() {
  document.getElementById('csf-overlay-container')?.remove()
}

/**
 * ISO文字列からGoogle Calendar URL用の日時文字列を生成する
 * "2026-02-24T09:00:00+09:00" → "20260224T090000"
 * ローカル時刻をそのまま使用し、UTC変換しない
 */
function toGCalDate(iso: string): string {
  const [datePart, rest] = iso.split('T')
  const timePart = rest.replace(/[+-]\d{2}:\d{2}$/, '').replace(/Z$/, '')
  return datePart.replace(/-/g, '') + 'T' + timePart.replace(/:/g, '').split('.')[0]
}
