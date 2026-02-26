import { useState, useEffect } from 'react'
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  FormControlLabel,
  FormGroup,
  Typography,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  ListItemText,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import GroupAddIcon from '@mui/icons-material/GroupAdd'
import CheckIcon from '@mui/icons-material/Check'
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
  const [loadError, setLoadError] = useState(false)
  const [groups, setGroups] = useState<FavoriteGroup[]>([])
  const [addToGroupAnchor, setAddToGroupAnchor] = useState<null | HTMLElement>(null)
  const [addToGroupCalendar, setAddToGroupCalendar] = useState<CalendarItem | null>(null)

  useEffect(() => {
    loadCalendars()
    groupStorage.getAllGroups().then(setGroups).catch((error) => {
      console.warn('Failed to load groups:', error)
    })
  }, [])

  const refreshGroups = async () => {
    setGroups(await groupStorage.getAllGroups())
  }

  const handleToggleGroup = async (groupId: string) => {
    if (!addToGroupCalendar) return
    const group = groups.find((g) => g.id === groupId)
    const isInGroup = group?.members.some((m) => m.email === addToGroupCalendar.id)
    if (isInGroup) {
      await groupStorage.removeMemberFromGroup(groupId, addToGroupCalendar.id)
    } else {
      await groupStorage.addMemberToGroup(groupId, {
        email: addToGroupCalendar.id,
        name: addToGroupCalendar.summary,
      })
    }
    await refreshGroups()
    setAddToGroupAnchor(null)
    setAddToGroupCalendar(null)
  }

  const loadCalendars = async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const result = await sendMessage<CalendarListResponse>({
        type: 'FETCH_CALENDAR_LIST',
      })
      if (!Array.isArray(result?.items)) {
        setLoadError(true)
        return
      }
      setCalendars(
        result.items
          .filter((c) => c.primary !== true)
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
      setLoadError(true)
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
    <Box sx={{ mt: 2, pr: 1 }}>
      <Typography variant="subtitle2" gutterBottom>
        カレンダー
      </Typography>
      {loadError && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            カレンダーの読み込みに失敗しました。再読み込みしてください。
          </Typography>
          <Button size="small" startIcon={<RefreshIcon />} onClick={loadCalendars}>
            再読み込み
          </Button>
        </Box>
      )}
      <FormGroup>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <FormControlLabel
            sx={{ flex: 1, mr: 0 }}
            control={
              <Checkbox
                checked={state.calendarIds.includes('primary')}
                onChange={() => handleToggle('primary')}
                size="small"
              />
            }
            label="自分のカレンダー"
          />
          <Chip label="メイン" size="small" color="primary" variant="outlined" sx={{ ml: 0.5 }} />
        </Box>
        {calendars.length > 0 && <Divider sx={{ my: 0.5 }} />}
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
              sx={{ p: 0.3, flexShrink: 0 }}
              aria-label="グループに追加"
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
        {groups.map((g) => {
          const isInGroup = addToGroupCalendar
            ? g.members.some((m) => m.email === addToGroupCalendar.id)
            : false
          return (
            <MenuItem key={g.id} onClick={() => handleToggleGroup(g.id)}>
              {isInGroup && <CheckIcon sx={{ fontSize: 18, color: 'primary.main', mr: 1 }} />}
              <ListItemText>{g.name}</ListItemText>
            </MenuItem>
          )
        })}
        {groups.length === 0 && (
          <MenuItem disabled>グループがありません</MenuItem>
        )}
      </Menu>
    </Box>
  )
}
