import { useState, useEffect } from 'react'
import {
  Box,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Typography,
  CircularProgress,
} from '@mui/material'
import { useAppContext } from '../context/AppContext'
import { sendMessage } from '../hooks/useApi'
import type { CalendarListResponse } from '../../types/api'

interface CalendarItem {
  id: string
  summary: string
  primary?: boolean
}

export default function CalendarPicker() {
  const { state, dispatch } = useAppContext()
  const [calendars, setCalendars] = useState<CalendarItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCalendars()
  }, [])

  const loadCalendars = async () => {
    try {
      const result = await sendMessage<CalendarListResponse>({
        type: 'FETCH_CALENDAR_LIST',
      })
      setCalendars(
        result.items
          .filter((c) => !c.primary)
          .map((c) => ({ id: c.id, summary: c.summary }))
      )
    } catch {
      // エラー時は空リスト
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = (id: string) => {
    const newIds = state.calendarIds.includes(id)
      ? state.calendarIds.filter((cid) => cid !== id)
      : [...state.calendarIds, id]
    dispatch({ type: 'SET_CALENDAR_IDS', payload: newIds })
  }

  if (loading) return <CircularProgress size={24} />

  if (calendars.length === 0) return null

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        共有カレンダー
      </Typography>
      <FormGroup>
        {calendars.map((cal) => (
          <FormControlLabel
            key={cal.id}
            control={
              <Checkbox
                checked={state.calendarIds.includes(cal.id)}
                onChange={() => handleToggle(cal.id)}
                size="small"
              />
            }
            label={cal.summary}
          />
        ))}
      </FormGroup>
    </Box>
  )
}
