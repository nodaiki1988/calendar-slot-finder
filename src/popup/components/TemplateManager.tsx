import { useState, useEffect } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import TimerIcon from '@mui/icons-material/Timer'
import { useAppContext } from '../context/AppContext'
import { TemplateStorage } from '../../services/template-storage'
import ConfirmDialog from './ConfirmDialog'
import type { Template } from '../../types'

const storage = new TemplateStorage()

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

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
            onClick={() => setLoadOpen(true)}
            disabled={templates.length === 0}
          >
            読み込み{templates.length > 0 ? ` (${templates.length})` : ''}
          </Button>
        </span>
      </Tooltip>

      {/* 保存ダイアログ */}
      <Dialog open={saveOpen} onClose={() => setSaveOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>テンプレートを保存</DialogTitle>
        <DialogContent>
          <TextField
            label="テンプレート名"
            placeholder="例: 定例会議、夜の交流会"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) handleSave() }}
            fullWidth
            size="small"
            sx={{ mt: 1 }}
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSaveOpen(false)}>キャンセル</Button>
          <Button variant="contained" onClick={handleSave} disabled={!name.trim()} disableElevation>
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* 読み込みダイアログ */}
      <Dialog open={loadOpen} onClose={() => setLoadOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>テンプレートを選択</DialogTitle>
        <DialogContent sx={{ px: 2, pb: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {templates.map((t) => (
              <Box
                key={t.id}
                onClick={() => handleLoad(t)}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'primary.50',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                  },
                }}
              >
                {/* ヘッダー: 名前 + 削除 */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {t.name}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(t) }}
                    sx={{ p: 0.3, opacity: 0.4, '&:hover': { opacity: 1 } }}
                  >
                    <DeleteIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>

                {/* 検索条件の情報 */}
                {t.searchConfig && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    {/* 曜日バッジ */}
                    <Box sx={{ display: 'flex', gap: 0.3 }}>
                      {DAY_LABELS.map((label, idx) => (
                        <Box
                          key={idx}
                          sx={{
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            fontWeight: 600,
                            bgcolor: t.searchConfig.daysOfWeek.includes(idx)
                              ? 'primary.main'
                              : 'action.hover',
                            color: t.searchConfig.daysOfWeek.includes(idx)
                              ? 'primary.contrastText'
                              : 'text.disabled',
                          }}
                        >
                          {label}
                        </Box>
                      ))}
                    </Box>

                    {/* 時間帯・所要時間チップ */}
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Chip
                        icon={<AccessTimeIcon sx={{ fontSize: 14 }} />}
                        label={`${t.searchConfig.timeRange.start}〜${t.searchConfig.timeRange.end}`}
                        size="small"
                        variant="outlined"
                        sx={{ height: 24, '& .MuiChip-label': { px: 0.75, fontSize: 12 }, '& .MuiChip-icon': { ml: 0.5 } }}
                      />
                      <Chip
                        icon={<TimerIcon sx={{ fontSize: 14 }} />}
                        label={`${t.searchConfig.minimumDurationMinutes}分`}
                        size="small"
                        variant="outlined"
                        sx={{ height: 24, '& .MuiChip-label': { px: 0.75, fontSize: 12 }, '& .MuiChip-icon': { ml: 0.5 } }}
                      />
                    </Box>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
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
