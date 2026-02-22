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
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import BookmarkIcon from '@mui/icons-material/Bookmark'
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder'
import { useAppContext } from '../context/AppContext'
import { TemplateStorage } from '../../services/template-storage'
import type { Template } from '../../types'

const storage = new TemplateStorage()

export default function TemplateManager() {
  const { state, dispatch } = useAppContext()
  const [templates, setTemplates] = useState<Template[]>([])
  const [saveOpen, setSaveOpen] = useState(false)
  const [loadOpen, setLoadOpen] = useState(false)
  const [name, setName] = useState('')

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

  const handleDelete = async (id: string) => {
    await storage.remove(id)
    setTemplates(await storage.getAll())
  }

  return (
    <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
      <Button
        size="small"
        startIcon={<BookmarkBorderIcon />}
        onClick={() => setSaveOpen(true)}
        disabled={state.members.length === 0}
      >
        保存
      </Button>
      <Button
        size="small"
        startIcon={<BookmarkIcon />}
        onClick={() => setLoadOpen(true)}
        disabled={templates.length === 0}
      >
        読み込み ({templates.length})
      </Button>

      <Dialog open={saveOpen} onClose={() => setSaveOpen(false)}>
        <DialogTitle>テンプレートを保存</DialogTitle>
        <DialogContent>
          <TextField
            label="テンプレート名"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            size="small"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveOpen(false)}>キャンセル</Button>
          <Button variant="contained" onClick={handleSave} disabled={!name.trim()}>
            保存
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={loadOpen} onClose={() => setLoadOpen(false)}>
        <DialogTitle>テンプレートを選択</DialogTitle>
        <DialogContent>
          <List>
            {templates.map((t) => (
              <ListItem
                key={t.id}
                secondaryAction={
                  <IconButton edge="end" onClick={() => handleDelete(t.id)}>
                    <DeleteIcon />
                  </IconButton>
                }
                disablePadding
              >
                <ListItemButton onClick={() => handleLoad(t)}>
                  <ListItemText
                    primary={t.name}
                    secondary={`${t.members.length}人`}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>
    </Box>
  )
}
