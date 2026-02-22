import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import EmailIcon from '@mui/icons-material/Email'
import { useAppContext } from '../context/AppContext'
import { formatSlotsAsText, formatSlotsAsMailto } from '../../logic/share-formatter'

interface Props {
  open: boolean
  onClose: () => void
}

export default function ShareDialog({ open, onClose }: Props) {
  const { state } = useAppContext()
  const [mode, setMode] = useState<'copy' | 'email'>('copy')
  const [copied, setCopied] = useState(false)

  const text = formatSlotsAsText(state.results)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleEmail = () => {
    const emails = state.members.map((m) => m.email)
    const url = formatSlotsAsMailto(state.results, emails)
    window.open(url)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>結果を共有</DialogTitle>
      <DialogContent>
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(_e, v) => v && setMode(v)}
          size="small"
          sx={{ mb: 2 }}
        >
          <ToggleButton value="copy">
            <ContentCopyIcon sx={{ mr: 0.5 }} /> コピー
          </ToggleButton>
          <ToggleButton value="email">
            <EmailIcon sx={{ mr: 0.5 }} /> メール
          </ToggleButton>
        </ToggleButtonGroup>

        <TextField
          value={text}
          multiline
          rows={8}
          fullWidth
          size="small"
          slotProps={{ input: { readOnly: true } }}
        />

        {copied && <Alert severity="success" sx={{ mt: 1 }}>コピーしました</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>閉じる</Button>
        {mode === 'copy' ? (
          <Button variant="contained" onClick={handleCopy}>クリップボードにコピー</Button>
        ) : (
          <Button variant="contained" onClick={handleEmail}>メールで送信</Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
