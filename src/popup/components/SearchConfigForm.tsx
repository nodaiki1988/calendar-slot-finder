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
  Checkbox,
  FormControlLabel,
  LinearProgress,
  CircularProgress,
  Chip,
  Tooltip,
} from '@mui/material'
import { useState } from 'react'
import { useAppContext } from '../context/AppContext'
import { sendMessage } from '../hooks/useApi'
import { findAvailableSlots, filterByDaysOfWeek, filterByTimeRange, splitIntoFixedSlots, filterAllDayEvents, filterByHolidays } from '../../logic/slot-finder'
import { getLocalTimezoneOffset } from '../../utils/format'
import { SearchHistoryStorage } from '../../services/search-history'
import type { FreeBusyResponse } from '../../types/api'
import TemplateManager from './TemplateManager'
import type { TimeSlot } from '../../types'

const searchHistory = new SearchHistoryStorage()

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getThisWeekRange(): { start: string; end: string } {
  const today = new Date()
  const dow = today.getDay() // 0=日
  // 土日の場合は来週月〜金を返す
  if (dow === 0 || dow === 6) return getNextWeekRange()
  const daysUntilFri = 5 - dow
  const fri = new Date(today)
  fri.setDate(today.getDate() + daysUntilFri)
  return { start: toDateStr(today), end: toDateStr(fri) }
}

function getNextWeekRange(): { start: string; end: string } {
  const today = new Date()
  const dow = today.getDay()
  const daysUntilMon = dow === 0 ? 1 : 8 - dow
  const mon = new Date(today)
  mon.setDate(today.getDate() + daysUntilMon)
  const fri = new Date(mon)
  fri.setDate(mon.getDate() + 4)
  return { start: toDateStr(mon), end: toDateStr(fri) }
}

function getThisMonthRange(): { start: string; end: string } {
  const today = new Date()
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  return { start: toDateStr(today), end: toDateStr(lastDay) }
}

export default function SearchConfigForm() {
  const { state, dispatch } = useAppContext()
  const { searchConfig } = state
  const [error, setError] = useState<string | null>(null)
  const [errorSuggestions, setErrorSuggestions] = useState<string[]>([])

  const setDateRange = (range: { start: string; end: string }) => {
    dispatch({
      type: 'SET_SEARCH_CONFIG',
      payload: { ...searchConfig, dateRange: range },
    })
  }

  const handleDaysChange = (_e: unknown, newDays: number[]) => {
    dispatch({
      type: 'SET_SEARCH_CONFIG',
      payload: { ...searchConfig, daysOfWeek: newDays },
    })
  }

  const handleSearch = async () => {
    dispatch({ type: 'SET_LOADING', payload: true })
    setError(null)
    setErrorSuggestions([])

    try {
      const items = [
        ...state.members.map((m) => ({ id: m.email })),
        ...state.calendarIds.map((id) => ({ id })),
      ]

      if (items.length === 0) {
        setError('メンバーまたはカレンダーを選択してください')
        return
      }

      if (searchConfig.dateRange.start > searchConfig.dateRange.end) {
        setError('開始日は終了日より前に設定してください')
        return
      }

      if (searchConfig.timeRange.start >= searchConfig.timeRange.end) {
        setError('開始時間は終了時間より前に設定してください')
        return
      }

      const tzOffset = getLocalTimezoneOffset()

      const result = await sendMessage<FreeBusyResponse>({
        type: 'FETCH_FREE_BUSY',
        payload: {
          timeMin: `${searchConfig.dateRange.start}T00:00:00${tzOffset}`,
          timeMax: `${searchConfig.dateRange.end}T23:59:59${tzOffset}`,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          items,
        },
      })

      // カレンダーごとのエラーを検出して警告表示
      const calendarErrors: string[] = []
      for (const [id, cal] of Object.entries(result.calendars)) {
        if (cal.errors && cal.errors.length > 0) {
          calendarErrors.push(id)
        }
      }
      if (calendarErrors.length > 0) {
        setError(`以下のカレンダーの情報を取得できませんでした: ${calendarErrors.join(', ')}`)
      }

      const startISO = `${searchConfig.dateRange.start}T${searchConfig.timeRange.start}:00${tzOffset}`
      const endISO = `${searchConfig.dateRange.end}T${searchConfig.timeRange.end}:00${tzOffset}`

      const allBusy: TimeSlot[] = Object.values(result.calendars).flatMap(
        (cal) => cal.busy || []
      )

      let filteredBusy = allBusy
      if (searchConfig.excludeAllDayEvents) {
        filteredBusy = filterAllDayEvents(allBusy)
      }

      let slots = findAvailableSlots(filteredBusy, startISO, endISO)

      slots = filterByDaysOfWeek(slots, searchConfig.daysOfWeek)
      slots = filterByTimeRange(slots, searchConfig.timeRange.start, searchConfig.timeRange.end)
      slots = splitIntoFixedSlots(slots, searchConfig.minimumDurationMinutes)
      if (searchConfig.excludeHolidays) {
        const holidayResult = filterByHolidays(slots, searchConfig.dateRange.start, searchConfig.dateRange.end)
        slots = holidayResult.slots
        dispatch({ type: 'SET_EXCLUDED_HOLIDAYS', payload: holidayResult.excludedHolidays })
      } else {
        dispatch({ type: 'SET_EXCLUDED_HOLIDAYS', payload: [] })
      }

      if (slots.length === 0) {
        setError(
          `条件に合う空き時間が見つかりません。以下を試してください：`
        )
        setErrorSuggestions([
          `日付範囲を広げる`,
          `所要時間を短くする（現在: ${searchConfig.minimumDurationMinutes}分）`,
          `時間帯を広げる（現在: ${searchConfig.timeRange.start}〜${searchConfig.timeRange.end}）`,
        ])
      } else {
        dispatch({ type: 'SET_RESULTS', payload: slots })
        searchHistory.save({
          members: state.members,
          calendarIds: state.calendarIds,
          searchConfig,
        }).catch(() => {})
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '検索中にエラーが発生しました')
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          検索条件
        </Typography>
        <TemplateManager />
      </Box>

      <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5 }}>
        <Chip label="今週" size="small" variant="outlined" clickable onClick={() => setDateRange(getThisWeekRange())} />
        <Chip label="来週" size="small" variant="outlined" clickable onClick={() => setDateRange(getNextWeekRange())} />
        <Chip label="今月" size="small" variant="outlined" clickable onClick={() => setDateRange(getThisMonthRange())} />
      </Box>

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
        <InputLabel>所要時間</InputLabel>
        <Select
          value={searchConfig.minimumDurationMinutes}
          label="所要時間"
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

      <FormControlLabel
        control={
          <Checkbox
            checked={searchConfig.excludeAllDayEvents}
            onChange={(e) =>
              dispatch({
                type: 'SET_SEARCH_CONFIG',
                payload: { ...searchConfig, excludeAllDayEvents: e.target.checked },
              })
            }
            size="small"
          />
        }
        label="終日の予定を除外する"
        sx={{ mb: 0.5 }}
      />

      <Tooltip title="検索期間内の祝日（例: 春分の日、天皇誕生日など）を候補から自動的に除外します" placement="top">
        <FormControlLabel
          control={
            <Checkbox
              checked={searchConfig.excludeHolidays}
              onChange={(e) =>
                dispatch({
                  type: 'SET_SEARCH_CONFIG',
                  payload: { ...searchConfig, excludeHolidays: e.target.checked },
                })
              }
              size="small"
            />
          }
          label="祝日を除外する"
          sx={{ mb: 2 }}
        />
      </Tooltip>

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 500, mb: errorSuggestions.length > 0 ? 0.5 : 0 }}>
            {error}
          </Typography>
          {errorSuggestions.length > 0 && (
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {errorSuggestions.map((s, i) => (
                <Typography key={i} component="li" variant="body2" sx={{ mb: 0.3 }}>
                  {s}
                </Typography>
              ))}
            </Box>
          )}
        </Alert>
      )}

      <Button
        variant="contained"
        fullWidth
        onClick={handleSearch}
        disabled={state.loading}
      >
        {state.loading && <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" />}
        {state.loading ? '検索中...' : '空き時間を検索'}
      </Button>
      {state.loading && <LinearProgress sx={{ mt: 1 }} />}
    </Box>
  )
}
