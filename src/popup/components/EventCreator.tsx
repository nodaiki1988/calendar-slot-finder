import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from '@mui/material'
import { useAppContext } from '../context/AppContext'
import { sendMessage } from '../hooks/useApi'
import type { AvailableSlot, RecurrenceFrequency } from '../../types'
import type { InsertEventRequest } from '../../types/api'

interface Props {
  slot: AvailableSlot | null
  open: boolean
  onClose: () => void
}

function toRRule(freq: RecurrenceFrequency, count: number): string {
  const f = freq === 'BIWEEKLY' ? 'WEEKLY' : freq
  const interval = freq === 'BIWEEKLY' ? ';INTERVAL=2' : ''
  return `RRULE:FREQ=${f}${interval};COUNT=${count}`
}

export default function EventCreator({ slot, open, onClose }: Props) {
  const { state } = useAppContext()
  const [summary, setSummary] = useState('')
  const [description, setDescription] = useState('')
  const [recurrence, setRecurrence] = useState<RecurrenceFrequency | ''>('')
  const [recurrenceCount, setRecurrenceCount] = useState(4)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleCreate = async () => {
    if (!slot || !summary.trim()) return
    setLoading(true)
    setError(null)

    try {
      const params: InsertEventRequest = {
        summary: summary.trim(),
        description: description.trim() || undefined,
        start: { dateTime: slot.start, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        end: { dateTime: slot.end, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        attendees: state.members.map((m) => ({ email: m.email })),
      }

      if (recurrence) {
        params.recurrence = [toRRule(recurrence, recurrenceCount)]
      }

      await sendMessage({ type: 'CREATE_EVENT', payload: params })
      setSuccess(true)
      setTimeout(() => {
        onClose()
        setSuccess(false)
        setSummary('')
        setDescription('')
        setRecurrence('')
      }, 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : '予定の作成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>予定を作成</DialogTitle>
      <DialogContent>
        {success && <Alert severity="success" sx={{ mb: 2 }}>予定を作成しました</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TextField
          label="タイトル"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          fullWidth
          size="small"
          sx={{ mt: 1, mb: 2 }}
          required
        />

        <TextField
          label="説明（任意）"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          fullWidth
          size="small"
          multiline
          rows={2}
          sx={{ mb: 2 }}
        />

        <FormControl size="small" fullWidth sx={{ mb: 2 }}>
          <InputLabel>繰り返し（任意）</InputLabel>
          <Select
            value={recurrence}
            label="繰り返し（任意）"
            onChange={(e) => setRecurrence(e.target.value as RecurrenceFrequency | '')}
          >
            <MenuItem value="">なし</MenuItem>
            <MenuItem value="DAILY">毎日</MenuItem>
            <MenuItem value="WEEKLY">毎週</MenuItem>
            <MenuItem value="BIWEEKLY">隔週</MenuItem>
            <MenuItem value="MONTHLY">毎月</MenuItem>
          </Select>
        </FormControl>

        {recurrence && (
          <TextField
            label="繰り返し回数"
            type="number"
            value={recurrenceCount}
            onChange={(e) => setRecurrenceCount(Number(e.target.value))}
            size="small"
            fullWidth
            slotProps={{ htmlInput: { min: 1, max: 52 } }}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>キャンセル</Button>
        <Button
          variant="contained"
          onClick={handleCreate}
          disabled={loading || !summary.trim()}
        >
          {loading ? '作成中...' : '作成'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
