import { useState, useEffect, useMemo, useRef } from 'react'
import { Box, Typography, Button, Chip, Divider } from '@mui/material'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import ShareIcon from '@mui/icons-material/Share'
import SelectAllIcon from '@mui/icons-material/SelectAll'
import DeselectIcon from '@mui/icons-material/Deselect'
import SlotCard from './SlotCard'
import EventCreator from './EventCreator'
import ShareDialog from './ShareDialog'
import { useAppContext } from '../context/AppContext'
import { formatDate, groupSlotsByDate } from '../../utils/format'
import type { AvailableSlot } from '../../types'

export default function ResultList() {
  const { state } = useAppContext()
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const lastClickedIndex = useRef<number | null>(null)

  // results変更時に全選択でリセット
  useEffect(() => {
    setSelectedIndices(new Set(state.results.map((_, i) => i)))
    lastClickedIndex.current = null
  }, [state.results])

  // grouped + indexマッピング
  const groupedWithIndex = useMemo(() => {
    const grouped = groupSlotsByDate(state.results)
    const result: [string, { slot: AvailableSlot; index: number }[]][] = []
    let idx = 0
    for (const [date, slots] of grouped) {
      const entries = slots.map((slot) => ({ slot, index: idx++ }))
      result.push([date, entries])
    }
    return result
  }, [state.results])

  const selectedCount = selectedIndices.size

  const selectedSlots = useMemo(() => {
    return state.results.filter((_, i) => selectedIndices.has(i))
  }, [state.results, selectedIndices])

  const handleSelectAll = () => {
    setSelectedIndices(new Set(state.results.map((_, i) => i)))
  }

  const handleDeselectAll = () => {
    setSelectedIndices(new Set())
  }

  const handleToggle = (index: number, e: React.MouseEvent) => {
    if (e.shiftKey && lastClickedIndex.current !== null) {
      const from = Math.min(lastClickedIndex.current, index)
      const to = Math.max(lastClickedIndex.current, index)
      const shouldSelect = !selectedIndices.has(index)
      setSelectedIndices((prev) => {
        const next = new Set(prev)
        for (let i = from; i <= to; i++) {
          if (shouldSelect) {
            next.add(i)
          } else {
            next.delete(i)
          }
        }
        return next
      })
    } else {
      setSelectedIndices((prev) => {
        const next = new Set(prev)
        if (next.has(index)) {
          next.delete(index)
        } else {
          next.add(index)
        }
        return next
      })
    }
    lastClickedIndex.current = index
  }

  const handleOverlay = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'SHOW_OVERLAY',
          payload: state.results,
        }).catch(() => {
          // content scriptが未ロードのタブでは送信失敗する（無視）
        })
      }
    })
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <Box sx={{ flex: 1, overflowY: 'auto', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            空き時間（{state.results.length}件）
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Button size="small" startIcon={<SelectAllIcon />} onClick={handleSelectAll}>
              全選択
            </Button>
            <Button size="small" startIcon={<DeselectIcon />} onClick={handleDeselectAll}>
              全解除
            </Button>
          </Box>
        </Box>

        {state.excludedHolidays.length > 0 && (
          <Chip
            icon={<InfoOutlinedIcon />}
            label={`${state.excludedHolidays.length}件の祝日を除外しました（${state.excludedHolidays.join('、')}）`}
            size="small"
            variant="outlined"
            color="info"
            sx={{ mb: 1 }}
          />
        )}

        {groupedWithIndex.map(([date, entries]) => (
          <Box key={date} sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              {formatDate(date)}
            </Typography>
            {entries.map(({ slot, index }) => (
              <SlotCard
                key={index}
                slot={slot}
                onCreateEvent={setSelectedSlot}
                checked={selectedIndices.has(index)}
                onToggle={(e) => handleToggle(index, e)}
              />
            ))}
            <Divider sx={{ mt: 1 }} />
          </Box>
        ))}
      </Box>

      <Box sx={{
        position: 'sticky',
        bottom: 0,
        bgcolor: 'background.paper',
        pt: 1,
        pb: 1,
        borderTop: '1px solid',
        borderColor: 'divider',
      }}>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
          {selectedCount}件選択中
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<CalendarTodayIcon />}
            onClick={handleOverlay}
            fullWidth
          >
            カレンダーに表示
          </Button>
          <Button
            variant="outlined"
            startIcon={<ShareIcon />}
            onClick={() => setShareOpen(true)}
            fullWidth
            disabled={selectedCount === 0}
          >
            共有
          </Button>
        </Box>
      </Box>

      <EventCreator
        slot={selectedSlot}
        open={selectedSlot !== null}
        onClose={() => setSelectedSlot(null)}
      />
      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} slots={selectedSlots} />
    </Box>
  )
}
