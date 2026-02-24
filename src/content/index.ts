import type { AvailableSlot } from '../types'

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
  (message: OverlayMessage, _sender, sendResponse) => {
    if (
      message.type === 'SHOW_OVERLAY' &&
      Array.isArray(message.payload) &&
      message.payload.every(isValidSlot)
    ) {
      showOverlay(message.payload)
      sendResponse({ success: true })
    } else if (message.type === 'HIDE_OVERLAY') {
      hideOverlay()
      sendResponse({ success: true })
    }
  }
)

function formatTime(d: Date): string {
  return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(d: Date): string {
  const days = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`
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
    const start = new Date(slot.start)
    const end = new Date(slot.end)

    const slotEl = document.createElement('div')
    slotEl.className = 'csf-overlay-slot'

    const dateEl = document.createElement('span')
    dateEl.className = 'csf-overlay-date'
    dateEl.textContent = formatDate(start)

    const timeEl = document.createElement('span')
    timeEl.className = 'csf-overlay-time'
    timeEl.textContent = `${formatTime(start)} - ${formatTime(end)}`

    slotEl.appendChild(dateEl)
    slotEl.appendChild(timeEl)

    slotEl.addEventListener('click', () => {
      const url = new URL('https://calendar.google.com/calendar/render')
      url.searchParams.set('action', 'TEMPLATE')
      url.searchParams.set('dates', `${toGCalDate(slot.start)}/${toGCalDate(slot.end)}`)
      window.open(url.toString(), '_blank')
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

function toGCalDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}
