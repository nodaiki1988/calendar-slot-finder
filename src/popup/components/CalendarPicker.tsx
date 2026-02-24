import { useState, useEffect } from 'react'
import {
  Box,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Typography,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material'
import GroupAddIcon from '@mui/icons-material/GroupAdd'
import { useAppContext } from '../context/AppContext'
import { sendMessage } from '../hooks/useApi'
import { FavoriteGroupStorage } from '../../services/favorite-group-storage'
import type { CalendarListResponse } from '../../types/api'
import type { FavoriteGroup } from '../../types'

interface CalendarItem {
  id: string
  summary: string
  primary?: boolean
}

const groupStorage = new FavoriteGroupStorage()

export default function CalendarPicker() {
  const { state, dispatch } = useAppContext()
  const [calendars, setCalendars] = useState<CalendarItem[]>([])
  const [loading, setLoading] = useState(true)
  const [groups, setGroups] = useState<FavoriteGroup[]>([])
  const [addToGroupAnchor, setAddToGroupAnchor] = useState<null | HTMLElement>(null)
  const [addToGroupCalendar, setAddToGroupCalendar] = useState<CalendarItem | null>(null)

  useEffect(() => {
    loadCalendars()
    groupStorage.getAllGroups().then(setGroups)
  }, [])

  const refreshGroups = async () => {
    setGroups(await groupStorage.getAllGroups())
  }

  const handleAddToGroup = async (groupId: string) => {
    if (!addToGroupCalendar) return
    await groupStorage.addMemberToGroup(groupId, {
      email: addToGroupCalendar.id,
      name: addToGroupCalendar.summary,
    })
    await refreshGroups()
    setAddToGroupAnchor(null)
    setAddToGroupCalendar(null)
  }

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
      // 初回読み込み時に自分のカレンダーをデフォルトで含める
      if (!state.calendarIds.includes('primary')) {
        dispatch({
          type: 'SET_CALENDAR_IDS',
          payload: ['primary', ...state.calendarIds],
        })
      }
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

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        カレンダー
      </Typography>
      <FormGroup>
        <FormControlLabel
          control={
            <Checkbox
              checked={state.calendarIds.includes('primary')}
              onChange={() => handleToggle('primary')}
              size="small"
            />
          }
          label="自分のカレンダー"
        />
        {calendars.map((cal) => (
          <Box key={cal.id} sx={{ display: 'flex', alignItems: 'center' }}>
            <FormControlLabel
              sx={{ flex: 1, mr: 0 }}
              control={
                <Checkbox
                  checked={state.calendarIds.includes(cal.id)}
                  onChange={() => handleToggle(cal.id)}
                  size="small"
                />
              }
              label={cal.summary}
            />
            <IconButton
              size="small"
              onClick={(e) => {
                setAddToGroupCalendar(cal)
                setAddToGroupAnchor(e.currentTarget)
              }}
              sx={{ p: 0.3 }}
              title="グループに追加"
            >
              <GroupAddIcon sx={{ fontSize: 18, color: 'action.active' }} />
            </IconButton>
          </Box>
        ))}
      </FormGroup>

      <Menu
        anchorEl={addToGroupAnchor}
        open={Boolean(addToGroupAnchor)}
        onClose={() => { setAddToGroupAnchor(null); setAddToGroupCalendar(null) }}
      >
        {groups.map((g) => (
          <MenuItem key={g.id} onClick={() => handleAddToGroup(g.id)}>
            {g.name}
          </MenuItem>
        ))}
        {groups.length === 0 && (
          <MenuItem disabled>グループがありません</MenuItem>
        )}
      </Menu>
    </Box>
  )
}
