import { Box, Button, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { formatTime } from '../../utils/format'
import type { AvailableSlot } from '../../types'

interface Props {
  slot: AvailableSlot
  onCreateEvent: (slot: AvailableSlot) => void
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}分`
  if (m === 0) return `${h}時間`
  return `${h}時間${m}分`
}

export default function SlotCard({ slot, onCreateEvent }: Props) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: 1.5,
        borderRadius: 2,
        bgcolor: 'rgba(52, 168, 83, 0.08)',
        border: '1px solid rgba(52, 168, 83, 0.3)',
        mb: 1,
      }}
    >
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {formatTime(slot.start)} - {formatTime(slot.end)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {formatDuration(slot.durationMinutes)}
        </Typography>
      </Box>
      <Button
        size="small"
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={() => onCreateEvent(slot)}
      >
        作成
      </Button>
    </Box>
  )
}
