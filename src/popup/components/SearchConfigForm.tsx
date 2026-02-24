import {
  Box,
  Typography,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Select,
  MenuItem,
  Button,
  FormControl,
  InputLabel,
  Alert,
} from '@mui/material'
import { useState } from 'react'
import { useAppContext } from '../context/AppContext'
import { sendMessage } from '../hooks/useApi'
import { findAvailableSlots, filterByDaysOfWeek, filterByTimeRange, splitIntoFixedSlots } from '../../logic/slot-finder'
import { getLocalTimezoneOffset } from '../../utils/format'
import type { FreeBusyResponse } from '../../types/api'
import type { TimeSlot } from '../../types'

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

export default function SearchConfigForm() {
  const { state, dispatch } = useAppContext()
  const { searchConfig } = state
  const [error, setError] = useState<string | null>(null)

  const handleDaysChange = (_e: unknown, newDays: number[]) => {
    dispatch({
      type: 'SET_SEARCH_CONFIG',
      payload: { ...searchConfig, daysOfWeek: newDays },
    })
  }

  const handleSearch = async () => {
    dispatch({ type: 'SET_LOADING', payload: true })
    setError(null)

    try {
      const tzOffset = getLocalTimezoneOffset()

      const items = [
        ...state.members.map((m) => ({ id: m.email })),
        ...state.calendarIds.map((id) => ({ id })),
      ]

      const result = await sendMessage<FreeBusyResponse>({
        type: 'FETCH_FREE_BUSY',
        payload: {
          timeMin: `${searchConfig.dateRange.start}T00:00:00${tzOffset}`,
          timeMax: `${searchConfig.dateRange.end}T23:59:59${tzOffset}`,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          items,
        },
      })

      const allBusy: TimeSlot[] = Object.values(result.calendars).flatMap(
        (cal) => cal.busy || []
      )

      const startISO = `${searchConfig.dateRange.start}T${searchConfig.timeRange.start}:00${tzOffset}`
      const endISO = `${searchConfig.dateRange.end}T${searchConfig.timeRange.end}:00${tzOffset}`

      let slots = findAvailableSlots(allBusy, startISO, endISO)

      slots = filterByDaysOfWeek(slots, searchConfig.daysOfWeek)
      slots = filterByTimeRange(slots, searchConfig.timeRange.start, searchConfig.timeRange.end)
      slots = splitIntoFixedSlots(slots, searchConfig.minimumDurationMinutes)

      if (slots.length === 0) {
        setError(
          `条件に合う空き時間が見つかりません。以下を試してください：\n` +
          `・日付範囲を広げる\n` +
          `・所要時間を短くする（現在: ${searchConfig.minimumDurationMinutes}分）\n` +
          `・時間帯を広げる（現在: ${searchConfig.timeRange.start}〜${searchConfig.timeRange.end}）`
        )
      } else {
        dispatch({ type: 'SET_RESULTS', payload: slots })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '検索中にエラーが発生しました')
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        検索条件
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          label="開始日"
          type="date"
          value={searchConfig.dateRange.start}
          onChange={(e) =>
            dispatch({
              type: 'SET_SEARCH_CONFIG',
              payload: {
                ...searchConfig,
                dateRange: { ...searchConfig.dateRange, start: e.target.value },
              },
            })
          }
          size="small"
          sx={{ flex: 1 }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="終了日"
          type="date"
          value={searchConfig.dateRange.end}
          onChange={(e) =>
            dispatch({
              type: 'SET_SEARCH_CONFIG',
              payload: {
                ...searchConfig,
                dateRange: { ...searchConfig.dateRange, end: e.target.value },
              },
            })
          }
          size="small"
          sx={{ flex: 1 }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Box>

      <Typography variant="subtitle2" gutterBottom>
        曜日
      </Typography>
      <ToggleButtonGroup
        value={searchConfig.daysOfWeek}
        onChange={handleDaysChange}
        size="small"
        sx={{ mb: 2, flexWrap: 'wrap' }}
      >
        {DAY_LABELS.map((label, idx) => (
          <ToggleButton key={idx} value={idx} sx={{ px: 1.5 }}>
            {label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          label="開始時間"
          type="time"
          value={searchConfig.timeRange.start}
          onChange={(e) =>
            dispatch({
              type: 'SET_SEARCH_CONFIG',
              payload: {
                ...searchConfig,
                timeRange: { ...searchConfig.timeRange, start: e.target.value },
              },
            })
          }
          size="small"
          sx={{ flex: 1 }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="終了時間"
          type="time"
          value={searchConfig.timeRange.end}
          onChange={(e) =>
            dispatch({
              type: 'SET_SEARCH_CONFIG',
              payload: {
                ...searchConfig,
                timeRange: { ...searchConfig.timeRange, end: e.target.value },
              },
            })
          }
          size="small"
          sx={{ flex: 1 }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Box>

      <FormControl size="small" fullWidth sx={{ mb: 2 }}>
        <InputLabel>MTG時間</InputLabel>
        <Select
          value={searchConfig.minimumDurationMinutes}
          label="MTG時間"
          onChange={(e) =>
            dispatch({
              type: 'SET_SEARCH_CONFIG',
              payload: {
                ...searchConfig,
                minimumDurationMinutes: e.target.value as number,
              },
            })
          }
        >
          <MenuItem value={15}>15分</MenuItem>
          <MenuItem value={30}>30分</MenuItem>
          <MenuItem value={60}>1時間</MenuItem>
          <MenuItem value={90}>1時間30分</MenuItem>
          <MenuItem value={120}>2時間</MenuItem>
        </Select>
      </FormControl>

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Button
        variant="contained"
        fullWidth
        onClick={handleSearch}
        disabled={state.loading}
      >
        {state.loading ? '検索中...' : '空き時間を検索'}
      </Button>
    </Box>
  )
}
