import { useState } from 'react'
import { Box, Typography, Button, Divider } from '@mui/material'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import ShareIcon from '@mui/icons-material/Share'
import SlotCard from './SlotCard'
import EventCreator from './EventCreator'
import ShareDialog from './ShareDialog'
import { useAppContext } from '../context/AppContext'
import { formatDate, groupSlotsByDate } from '../../utils/format'
import type { AvailableSlot } from '../../types'

export default function ResultList() {
  const { state } = useAppContext()
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const grouped = groupSlotsByDate(state.results)

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
          onClick={() => setShareOpen(true)}
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
      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} />
    </Box>
  )
}
