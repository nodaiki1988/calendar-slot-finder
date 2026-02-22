import type { AvailableSlot } from '../types'

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
