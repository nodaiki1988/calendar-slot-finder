import { useState, useEffect } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  Tooltip,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import BookmarkIcon from '@mui/icons-material/Bookmark'
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder'
import { useAppContext } from '../context/AppContext'
import { TemplateStorage } from '../../services/template-storage'
import ConfirmDialog from './ConfirmDialog'
import type { Template } from '../../types'

const storage = new TemplateStorage()

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

function formatTemplateInfo(t: Template): string {
  const parts: string[] = []
  if (t.members.length > 0) {
    parts.push(`${t.members.length}人`)
  }
  if (t.searchConfig) {
    const days = t.searchConfig.daysOfWeek.map((d) => DAY_LABELS[d]).join('')
    const time = `${t.searchConfig.timeRange.start}〜${t.searchConfig.timeRange.end}`
    parts.push(`${days} ${time}`)
    parts.push(`${t.searchConfig.minimumDurationMinutes}分`)
  }
  return parts.join(' / ')
}

export default function TemplateManager() {
  const { state, dispatch } = useAppContext()
  const [templates, setTemplates] = useState<Template[]>([])
  const [saveOpen, setSaveOpen] = useState(false)
  const [loadOpen, setLoadOpen] = useState(false)
  const [name, setName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null)

  useEffect(() => {
    storage.getAll().then(setTemplates)
  }, [])

  const handleSave = async () => {
    if (!name.trim()) return
    await storage.save({
      name: name.trim(),
      members: state.members,
      calendarIds: state.calendarIds,
      searchConfig: state.searchConfig,
    })
    setTemplates(await storage.getAll())
    setSaveOpen(false)
    setName('')
  }

  const handleLoad = (template: Template) => {
    dispatch({ type: 'LOAD_TEMPLATE', payload: template })
    setLoadOpen(false)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await storage.remove(deleteTarget.id)
    setDeleteTarget(null)
    setTemplates(await storage.getAll())
  }

  return (
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      <Button
        size="small"
        startIcon={<BookmarkBorderIcon />}
        onClick={() => setSaveOpen(true)}
      >
        保存
      </Button>
      <Tooltip title={templates.length === 0 ? '検索条件をテンプレートとして保存すると、次回から素早く同じ条件で検索できます' : ''}>
        <span>
          <Button
            size="small"
            startIcon={<BookmarkIcon />}
            onClick={() => setLoadOpen(true)}
            disabled={templates.length === 0}
          >
            読み込み ({templates.length})
          </Button>
        </span>
      </Tooltip>

      <Dialog open={saveOpen} onClose={() => setSaveOpen(false)}>
        <DialogTitle>テンプレートを保存</DialogTitle>
        <DialogContent>
          <TextField
            label="テンプレート名（例: 定例会議、夜の交流会）"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            size="small"
            sx={{ mt: 1 }}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveOpen(false)}>キャンセル</Button>
          <Button variant="contained" onClick={handleSave} disabled={!name.trim()}>
            保存
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={loadOpen} onClose={() => setLoadOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>テンプレートを選択</DialogTitle>
        <DialogContent>
          <List>
            {templates.map((t) => (
              <ListItem
                key={t.id}
                secondaryAction={
                  <IconButton edge="end" onClick={() => setDeleteTarget(t)}>
                    <DeleteIcon />
                  </IconButton>
                }
                disablePadding
              >
                <ListItemButton onClick={() => handleLoad(t)}>
                  <ListItemText
                    primary={t.name}
                    secondary={formatTemplateInfo(t)}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="テンプレートの削除"
        message={`テンプレート「${deleteTarget?.name ?? ''}」を削除しますか？`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  )
}
