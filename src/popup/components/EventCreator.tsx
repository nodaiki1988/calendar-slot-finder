import { useState, useMemo, useEffect, useRef } from 'react'
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
  Typography,
  Box,
  Chip,
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
  const [removedEmails, setRemovedEmails] = useState<Set<string>>(new Set())
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // アンマウント時にタイマーをクリア
  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
    }
  }, [])

  const allGuests = useMemo(() => {
    const fromMembers = state.members.map((m) => ({
      email: m.email,
      name: m.name,
    }))
    const fromCalendars = state.calendarIds
      .filter((id) => id !== 'primary' && id.includes('@'))
      .filter((id) => !state.members.some((m) => m.email === id))
      .map((id) => ({ email: id, name: id }))
    return [...fromMembers, ...fromCalendars]
  }, [state.members, state.calendarIds])

  const activeGuests = allGuests.filter((g) => !removedEmails.has(g.email))

  const handleCreate = async () => {
    const currentSlot = slot
    if (!currentSlot || !summary.trim()) return
    setLoading(true)
    setError(null)

    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      const params: InsertEventRequest = {
        summary: summary.trim(),
        description: description.trim() || undefined,
        start: { dateTime: currentSlot.start, timeZone: tz },
        end: { dateTime: currentSlot.end, timeZone: tz },
        attendees: activeGuests.map((g) => ({ email: g.email })),
      }

      if (recurrence) {
        params.recurrence = [toRRule(recurrence, recurrenceCount)]
      }

      await sendMessage({ type: 'CREATE_EVENT', payload: params })
      setSuccess(true)
      successTimerRef.current = setTimeout(() => {
        onClose()
        setSuccess(false)
        setSummary('')
        setDescription('')
        setRecurrence('')
        setRemovedEmails(new Set())
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

        {activeGuests.length > 0 && (
          <Box sx={{ mt: 1, mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              ゲスト（{activeGuests.length}人）
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {activeGuests.map((g) => (
                <Chip
                  key={g.email}
                  label={g.name !== g.email ? g.name : g.email}
                  size="small"
                  onDelete={() =>
                    setRemovedEmails((prev) => new Set([...prev, g.email]))
                  }
                />
              ))}
            </Box>
          </Box>
        )}

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
