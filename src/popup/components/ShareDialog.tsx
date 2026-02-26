import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  Tab,
  Tabs,
  Box,
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import EmailIcon from '@mui/icons-material/Email'
import { useAppContext } from '../context/AppContext'
import {
  formatSlotsAsText,
  formatSlotsAsMailto,
  formatSlotsAsVoting,
  formatSlotsForSlack,
  formatSlotsForTeams,
} from '../../logic/share-formatter'
import type { AvailableSlot } from '../../types'

type ShareMode = 'text' | 'email' | 'voting' | 'slack' | 'teams'

interface Props {
  open: boolean
  onClose: () => void
  slots: AvailableSlot[]
}

export default function ShareDialog({ open, onClose, slots }: Props) {
  const { state } = useAppContext()
  const [mode, setMode] = useState<ShareMode>('text')
  const [copied, setCopied] = useState(false)
  const [headerText, setHeaderText] = useState('【空き時間】')

  const previewText = useMemo(() => {
    switch (mode) {
      case 'text':
      case 'email':
        return formatSlotsAsText(slots, headerText)
      case 'voting':
        return formatSlotsAsVoting(slots)
      case 'slack':
        return formatSlotsForSlack(slots, headerText)
      case 'teams':
        return formatSlotsForTeams(slots, headerText)
    }
  }, [slots, mode, headerText])

  const [copyError, setCopyError] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(previewText)
      setCopied(true)
      setCopyError(false)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopyError(true)
      setTimeout(() => setCopyError(false), 3000)
    }
  }

  const handleEmail = () => {
    const emails = state.members
      .map((m) => m.email)
      .filter((e) => !e.endsWith('.calendar.google.com'))
    const url = formatSlotsAsMailto(slots, emails, headerText)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const showHeaderInput = mode !== 'voting'

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>結果を共有</DialogTitle>
      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs
            value={mode}
            onChange={(_e, v) => { setMode(v); setCopied(false) }}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ minHeight: 42 }}
          >
            <Tab label="テキスト" value="text" sx={{ minHeight: 42, py: 0.5, fontSize: '0.8rem' }} />
            <Tab label="メール" value="email" sx={{ minHeight: 42, py: 0.5, fontSize: '0.8rem' }} />
            <Tab label="投票用" value="voting" sx={{ minHeight: 42, py: 0.5, fontSize: '0.8rem' }} />
            <Tab label="Slack" value="slack" sx={{ minHeight: 42, py: 0.5, fontSize: '0.8rem' }} />
            <Tab label="Teams" value="teams" sx={{ minHeight: 42, py: 0.5, fontSize: '0.8rem' }} />
          </Tabs>
        </Box>

        {showHeaderInput && (
          <TextField
            label="ヘッダー文言"
            value={headerText}
            onChange={(e) => setHeaderText(e.target.value)}
            size="small"
            fullWidth
            sx={{ mb: 1 }}
          />
        )}

        <TextField
          value={previewText}
          multiline
          rows={8}
          fullWidth
          size="small"
          slotProps={{ input: { readOnly: true } }}
        />

        {copied && <Alert severity="success" sx={{ mt: 1 }}>コピーしました</Alert>}
        {copyError && <Alert severity="error" sx={{ mt: 1 }}>クリップボードへのコピーに失敗しました</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>閉じる</Button>
        {mode === 'email' ? (
          <Button variant="contained" startIcon={<EmailIcon />} onClick={handleEmail}>
            メールで送信
          </Button>
        ) : (
          <Button variant="contained" startIcon={<ContentCopyIcon />} onClick={handleCopy}>
            クリップボードにコピー
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
