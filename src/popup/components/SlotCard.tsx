import { Box, Button, Checkbox, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { formatTime } from '../../utils/format'
import type { AvailableSlot } from '../../types'

interface Props {
  slot: AvailableSlot
  onCreateEvent: (slot: AvailableSlot) => void
  checked?: boolean
  onToggle?: (e: React.MouseEvent) => void
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}分`
  if (m === 0) return `${h}時間`
  return `${h}時間${m}分`
}

export default function SlotCard({ slot, onCreateEvent, checked, onToggle }: Props) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: 1.5,
        borderRadius: 2,
        bgcolor: checked === false ? 'rgba(0, 0, 0, 0.04)' : 'rgba(52, 168, 83, 0.08)',
        border: checked === false ? '1px solid rgba(0, 0, 0, 0.12)' : '1px solid rgba(52, 168, 83, 0.3)',
        opacity: checked === false ? 0.6 : 1,
        mb: 1,
      }}
    >
      {onToggle && (
        <Checkbox
          checked={checked}
          onClick={onToggle}
          size="small"
          sx={{ p: 0.5, mr: 1 }}
        />
      )}
      <Box sx={{ flex: 1 }}>
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
