import { useState, useEffect } from 'react'
import {
  Box,
  TextField,
  Autocomplete,
  Chip,
  Typography,
  Button,
  CircularProgress,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import GroupAddIcon from '@mui/icons-material/GroupAdd'
import CheckIcon from '@mui/icons-material/Check'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import { useAppContext } from '../context/AppContext'
import { sendMessage } from '../hooks/useApi'
import { FavoriteGroupStorage } from '../../services/favorite-group-storage'
import ConfirmDialog from './ConfirmDialog'
import type { Member, FavoriteGroup } from '../../types'
import type { DirectoryPeopleResponse } from '../../types/api'

const groupStorage = new FavoriteGroupStorage()

export default function MemberPicker() {
  const { state, dispatch } = useAppContext()
  const [inputValue, setInputValue] = useState('')
  const [options, setOptions] = useState<Member[]>([])
  const [searching, setSearching] = useState(false)
  const [groups, setGroups] = useState<FavoriteGroup[]>([])
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [addToGroupAnchor, setAddToGroupAnchor] = useState<null | HTMLElement>(null)
  const [addToGroupMember, setAddToGroupMember] = useState<Member | null>(null)
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<FavoriteGroup | null>(null)

  useEffect(() => {
    const init = async () => {
      await groupStorage.migrateFromLegacy()
      setGroups(await groupStorage.getAllGroups())
    }
    init()
  }, [])

  const refreshGroups = async () => {
    setGroups(await groupStorage.getAllGroups())
  }

  const handleSearch = async (query: string) => {
    if (query.length < 2) {
      setOptions([])
      return
    }
    setSearching(true)
    try {
      const result = await sendMessage<DirectoryPeopleResponse>({
        type: 'SEARCH_PEOPLE',
        payload: { query },
      })
      const members: Member[] = (result.people || [])
        .filter((p) => p.emailAddresses?.length)
        .map((p) => ({
          email: p.emailAddresses![0].value,
          name: p.names?.[0]?.displayName || p.emailAddresses![0].value,
          photoUrl: p.photos?.[0]?.url,
        }))
      setOptions(members)
    } catch {
      setOptions([])
    } finally {
      setSearching(false)
    }
  }

  const handleAddMember = (member: Member) => {
    if (!state.members.some((m) => m.email === member.email)) {
      dispatch({ type: 'ADD_MEMBER', payload: member })
    }
    setInputValue('')
    setOptions([])
  }

  const handleRemoveMember = (email: string) => {
    dispatch({ type: 'REMOVE_MEMBER', payload: email })
  }

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

  const handleAddManualEmail = () => {
    if (inputValue && isValidEmail(inputValue)) {
      handleAddMember({ email: inputValue, name: inputValue })
    }
  }

  const filteredOptions = options.filter(
    (o) => !state.members.some((m) => m.email === o.email)
  )

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return
    await groupStorage.saveGroup({ name: newGroupName.trim(), members: [] })
    await refreshGroups()
    setCreateDialogOpen(false)
    setNewGroupName('')
  }

  const handleDeleteGroup = async () => {
    if (!deleteGroupTarget) return
    await groupStorage.deleteGroup(deleteGroupTarget.id)
    setDeleteGroupTarget(null)
    await refreshGroups()
  }

  const handleToggleGroup = async (groupId: string) => {
    if (!addToGroupMember) return
    const group = groups.find((g) => g.id === groupId)
    const isInGroup = group?.members.some((m) => m.email === addToGroupMember.email)
    if (isInGroup) {
      await groupStorage.removeMemberFromGroup(groupId, addToGroupMember.email)
    } else {
      await groupStorage.addMemberToGroup(groupId, addToGroupMember)
    }
    await refreshGroups()
  }

  const handleRemoveFromGroup = async (groupId: string, email: string) => {
    await groupStorage.removeMemberFromGroup(groupId, email)
    await refreshGroups()
  }

  const isSelected = (email: string) => state.members.some((m) => m.email === email)

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        メンバーを選択
      </Typography>

      {/* 選択済みメンバー */}
      {state.members.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          メンバーを検索して追加してください。名前やメールアドレスで検索できます。
        </Typography>
      )}
      {state.members.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
          {state.members.map((member) => (
            <Box key={member.email} sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
              <Chip
                label={member.name}
                size="small"
                onDelete={() => handleRemoveMember(member.email)}
              />
              <IconButton
                size="small"
                onClick={(e) => {
                  setAddToGroupMember(member)
                  setAddToGroupAnchor(e.currentTarget)
                }}
                sx={{ p: 0.3 }}
                title="グループに追加"
              >
                <GroupAddIcon sx={{ fontSize: 18, color: 'action.active' }} />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}

      {/* グループに追加/削除メニュー */}
      <Menu
        anchorEl={addToGroupAnchor}
        open={Boolean(addToGroupAnchor)}
        onClose={() => { setAddToGroupAnchor(null); setAddToGroupMember(null) }}
      >
        {groups.map((g) => {
          const isInGroup = addToGroupMember
            ? g.members.some((m) => m.email === addToGroupMember.email)
            : false
          return (
            <MenuItem key={g.id} onClick={() => handleToggleGroup(g.id)}>
              <ListItemIcon sx={{ minWidth: 28 }}>
                {isInGroup && <CheckIcon sx={{ fontSize: 18, color: 'primary.main' }} />}
              </ListItemIcon>
              <ListItemText>{g.name}</ListItemText>
            </MenuItem>
          )
        })}
        {groups.length === 0 && (
          <MenuItem disabled>グループがありません</MenuItem>
        )}
      </Menu>

      {/* お気に入りグループ */}
      {groups.length > 0 && (
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
            お気に入りグループ
          </Typography>
          {groups.map((group) => (
            <Accordion key={group.id} disableGutters sx={{ '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 36, '& .MuiAccordionSummary-content': { my: 0.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, flex: 1 }}>
                    {group.name}（{group.members.length}）
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); setDeleteGroupTarget(group) }}
                    sx={{ p: 0.3 }}
                  >
                    <DeleteIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0, pb: 1 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {group.members.map((m) => (
                    <Chip
                      key={m.email}
                      label={m.name}
                      size="small"
                      color={isSelected(m.email) ? 'primary' : 'default'}
                      variant={isSelected(m.email) ? 'filled' : 'outlined'}
                      onClick={() => isSelected(m.email) ? handleRemoveMember(m.email) : handleAddMember(m)}
                      onDelete={() => handleRemoveFromGroup(group.id, m.email)}
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
                  {group.members.length === 0 && (
                    <Typography variant="caption" color="text.secondary">
                      メンバーがいません
                    </Typography>
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}

      {groups.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          よく使うメンバーの組み合わせをグループとして保存できます
        </Typography>
      )}

      {/* 新規グループ作成ボタン */}
      <Button
        size="small"
        startIcon={<AddIcon />}
        onClick={() => setCreateDialogOpen(true)}
        sx={{ mb: 1 }}
      >
        新規グループ
      </Button>

      {/* グループ作成ダイアログ */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)}>
        <DialogTitle>グループを作成</DialogTitle>
        <DialogContent>
          <TextField
            label="グループ名"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            fullWidth
            size="small"
            sx={{ mt: 1 }}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>キャンセル</Button>
          <Button variant="contained" onClick={handleCreateGroup} disabled={!newGroupName.trim()}>
            作成
          </Button>
        </DialogActions>
      </Dialog>

      {/* メンバー検索 */}
      <Autocomplete
        options={filteredOptions}
        getOptionLabel={(o) => `${o.name} (${o.email})`}
        value={null}
        onChange={(_e, member) => {
          if (member) handleAddMember(member)
        }}
        inputValue={inputValue}
        onInputChange={(_e, value, reason) => {
          setInputValue(value)
          if (reason === 'input') handleSearch(value)
        }}
        loading={searching}
        renderOption={(props, option) => (
          <li {...props} key={option.email}>
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <Box sx={{ flex: 1 }}>
                {option.name} ({option.email})
              </Box>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation()
                  setAddToGroupMember(option)
                  setAddToGroupAnchor(e.currentTarget)
                }}
                sx={{ p: 0.3 }}
                title="グループに追加"
              >
                <GroupAddIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
          </li>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            label="名前またはメールアドレス"
            placeholder="検索..."
            size="small"
            slotProps={{
              input: {
                ...params.InputProps,
                endAdornment: (
                  <>
                    {searching && <CircularProgress size={20} />}
                    {params.InputProps.endAdornment}
                  </>
                ),
              },
            }}
          />
        )}
        noOptionsText={
          inputValue.length >= 2
            ? 'メールアドレスを直接入力できます'
            : '2文字以上入力してください'
        }
        sx={{ mb: 1 }}
      />

      {isValidEmail(inputValue) && (
        <Button size="small" onClick={handleAddManualEmail} sx={{ mb: 1 }}>
          「{inputValue}」を追加
        </Button>
      )}

      <ConfirmDialog
        open={deleteGroupTarget !== null}
        title="グループの削除"
        message={`グループ「${deleteGroupTarget?.name ?? ''}」を削除しますか？`}
        onConfirm={handleDeleteGroup}
        onCancel={() => setDeleteGroupTarget(null)}
      />
    </Box>
  )
}
