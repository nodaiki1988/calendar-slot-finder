import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Typography,
} from '@mui/material'
import GroupsIcon from '@mui/icons-material/Groups'
import PersonSearchIcon from '@mui/icons-material/PersonSearch'
import { useAppContext } from '../context/AppContext'
import type { Purpose } from '../../types'

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

export default function PurposeSelector() {
  const { dispatch } = useAppContext()

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
              transition: 'all 0.15s ease-in-out',
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
                    bgcolor: 'rgba(26, 115, 232, 0.08)',
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
    </Box>
  )
}
