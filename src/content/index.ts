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

chrome.runtime.onMessage.addListener(
  (message: OverlayMessage, _sender, sendResponse) => {
    if (message.type === 'SHOW_OVERLAY' && message.payload) {
      showOverlay(message.payload)
      sendResponse({ success: true })
    } else if (message.type === 'HIDE_OVERLAY') {
      hideOverlay()
      sendResponse({ success: true })
    }
  }
)

function showOverlay(slots: AvailableSlot[]) {
  hideOverlay()

  const container = document.createElement('div')
  container.id = 'csf-overlay-container'
  container.innerHTML = `
    <div class="csf-overlay-panel">
      <div class="csf-overlay-header">
        <span>空き時間（${slots.length}件）</span>
        <button class="csf-overlay-close">&times;</button>
      </div>
      <div class="csf-overlay-list">
        ${slots.map((slot) => {
          const start = new Date(slot.start)
          const end = new Date(slot.end)
          const formatTime = (d: Date) =>
            d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
          const formatDate = (d: Date) => {
            const days = ['日', '月', '火', '水', '木', '金', '土']
            return `${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`
          }
          return `
            <div class="csf-overlay-slot" data-start="${slot.start}" data-end="${slot.end}">
              <span class="csf-overlay-date">${formatDate(start)}</span>
              <span class="csf-overlay-time">${formatTime(start)} - ${formatTime(end)}</span>
            </div>
          `
        }).join('')}
      </div>
    </div>
  `
  document.body.appendChild(container)

  container.querySelector('.csf-overlay-close')?.addEventListener('click', hideOverlay)

  container.querySelectorAll('.csf-overlay-slot').forEach((el) => {
    el.addEventListener('click', () => {
      const start = el.getAttribute('data-start')
      const end = el.getAttribute('data-end')
      if (start && end) {
        const url = new URL('https://calendar.google.com/calendar/render')
        url.searchParams.set('action', 'TEMPLATE')
        url.searchParams.set('dates', `${toGCalDate(start)}/${toGCalDate(end)}`)
        window.open(url.toString(), '_blank')
      }
    })
  })
}

function hideOverlay() {
  document.getElementById('csf-overlay-container')?.remove()
}

function toGCalDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}
