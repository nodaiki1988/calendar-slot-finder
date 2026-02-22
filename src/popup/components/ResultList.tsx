import { useState } from 'react'
import { Box, Typography, Button, Divider } from '@mui/material'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import ShareIcon from '@mui/icons-material/Share'
import SlotCard from './SlotCard'
import EventCreator from './EventCreator'
import { useAppContext } from '../context/AppContext'
import type { AvailableSlot } from '../../types'

function groupByDate(slots: AvailableSlot[]): Map<string, AvailableSlot[]> {
  const groups = new Map<string, AvailableSlot[]>()
  for (const slot of slots) {
    const date = slot.start.split('T')[0]
    const existing = groups.get(date) || []
    existing.push(slot)
    groups.set(date, existing)
  }
  return groups
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const days = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`
}

export default function ResultList() {
  const { state } = useAppContext()
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null)
  const grouped = groupByDate(state.results)

  const handleOverlay = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'SHOW_OVERLAY',
          payload: state.results,
        })
      }
    })
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        空き時間（{state.results.length}件）
      </Typography>

      {Array.from(grouped.entries()).map(([date, slots]) => (
        <Box key={date} sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            {formatDate(date)}
          </Typography>
          {slots.map((slot, i) => (
            <SlotCard
              key={i}
              slot={slot}
              onCreateEvent={setSelectedSlot}
            />
          ))}
          <Divider sx={{ mt: 1 }} />
        </Box>
      ))}

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="outlined"
          startIcon={<CalendarTodayIcon />}
          onClick={handleOverlay}
          fullWidth
        >
          カレンダーに表示
        </Button>
        <Button
          variant="outlined"
          startIcon={<ShareIcon />}
          onClick={() => {/* Task 14で実装 */}}
          fullWidth
        >
          共有
        </Button>
      </Box>

      <EventCreator
        slot={selectedSlot}
        open={selectedSlot !== null}
        onClose={() => setSelectedSlot(null)}
      />
    </Box>
  )
}
