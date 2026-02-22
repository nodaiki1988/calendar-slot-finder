import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Typography,
} from '@mui/material'
import GroupsIcon from '@mui/icons-material/Groups'
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd'
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
    description: 'チームメンバーの空き時間を見つけて会議をスケジュール',
    icon: <GroupsIcon sx={{ fontSize: 40 }} />,
  },
  {
    value: 'resource',
    label: 'リソース管理',
    description: '誰がいつ空いているかを一覧で確認',
    icon: <AssignmentIndIcon sx={{ fontSize: 40 }} />,
  },
  {
    value: 'personal',
    label: '個人の予定確認',
    description: '自分と相手の空き時間を素早く確認',
    icon: <PersonSearchIcon sx={{ fontSize: 40 }} />,
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
          <Card key={p.value} variant="outlined" sx={{ borderRadius: 3 }}>
            <CardActionArea onClick={() => dispatch({ type: 'SET_PURPOSE', payload: p.value })}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ color: 'primary.main' }}>{p.icon}</Box>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                    {p.label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
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
