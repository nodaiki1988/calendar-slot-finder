import { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Typography,
  List,
  ListItemButton,
  ListItemText,
} from '@mui/material'
import GroupsIcon from '@mui/icons-material/Groups'
import PersonSearchIcon from '@mui/icons-material/PersonSearch'
import HistoryIcon from '@mui/icons-material/History'
import { useAppContext } from '../context/AppContext'
import { SearchHistoryStorage, type SearchHistoryEntry } from '../../services/search-history'
import type { Purpose } from '../../types'

const historyStorage = new SearchHistoryStorage()

const purposes: Array<{
  value: Purpose
  label: string
  description: string
  icon: React.ReactNode
}> = [
  {
    value: 'meeting',
    label: '会議の日程調整',
    description: '全員の空き時間を見つけて会議をスケジュール',
    icon: <GroupsIcon sx={{ fontSize: 28 }} />,
  },
  {
    value: 'personal',
    label: '個人の予定確認',
    description: '自分のカレンダーの空き時間を素早く確認',
    icon: <PersonSearchIcon sx={{ fontSize: 28 }} />,
  },
]

function formatMembersSummary(members: { name: string }[]): string {
  if (members.length === 0) return '個人'
  if (members.length <= 2) return members.map((m) => m.name).join(', ')
  return `${members[0].name}, ${members[1].name} 他${members.length - 2}名`
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function PurposeSelector() {
  const { dispatch } = useAppContext()
  const [history, setHistory] = useState<SearchHistoryEntry[]>([])

  useEffect(() => {
    historyStorage.getAll().then((entries) => setHistory(entries.slice(0, 3))).catch(() => {})
  }, [])

  const handleLoadHistory = (entry: SearchHistoryEntry) => {
    dispatch({ type: 'LOAD_HISTORY', payload: entry })
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        何をしますか？
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {purposes.map((p) => (
          <Card
            key={p.value}
            variant="outlined"
            sx={{
              borderRadius: 3,
              transition: 'all 0.15s ease',
              '&:hover': {
                borderColor: 'primary.main',
                boxShadow: '0 1px 6px rgba(26,115,232,0.15)',
              },
            }}
          >
            <CardActionArea
              onClick={() => dispatch({ type: 'SET_PURPOSE', payload: p.value })}
            >
              <CardContent
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  py: 2,
                  px: 2.5,
                  height: 80,
                }}
              >
                <Box
                  sx={{
                    color: 'primary.main',
                    bgcolor: 'rgba(26, 115, 232, 0.12)',
                    borderRadius: 2,
                    width: 48,
                    height: 48,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {p.icon}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                    {p.label}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {p.description}
                  </Typography>
                </Box>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>

      {history.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <HistoryIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="subtitle2" color="text.secondary">
              最近の検索
            </Typography>
          </Box>
          <List dense disablePadding>
            {history.map((entry) => (
              <ListItemButton
                key={entry.id}
                onClick={() => handleLoadHistory(entry)}
                sx={{ borderRadius: 1, py: 0.5 }}
              >
                <ListItemText
                  primary={formatMembersSummary(entry.members)}
                  secondary={`${entry.searchConfig.dateRange.start} 〜 ${entry.searchConfig.dateRange.end} | ${formatTimestamp(entry.timestamp)}`}
                  primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </ListItemButton>
            ))}
          </List>
        </Box>
      )}
    </Box>
  )
}
