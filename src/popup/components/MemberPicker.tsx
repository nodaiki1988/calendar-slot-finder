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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  ListItemText,
} from '@mui/material'
import GroupAddIcon from '@mui/icons-material/GroupAdd'
import GroupsIcon from '@mui/icons-material/Groups'
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
    let mounted = true
    const init = async () => {
      try {
        await groupStorage.migrateFromLegacy()
        if (mounted) setGroups(await groupStorage.getAllGroups())
      } catch (error) {
        console.warn('Failed to initialize groups:', error)
        if (mounted) setGroups([])
      }
    }
    init()
    return () => { mounted = false }
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

  const isValidEmail = (value: string) => {
    if (value.length > 254) return false
    const parts = value.split('@')
    if (parts.length !== 2) return false
    const [local, domain] = parts
    return (
      local.length > 0 &&
      local.length <= 64 &&
      !local.startsWith('.') &&
      !local.endsWith('.') &&
      !local.includes('..') &&
      /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain)
    )
  }

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
    setAddToGroupAnchor(null)
    setAddToGroupMember(null)
  }

  const handleGroupSelect = (group: FavoriteGroup) => {
    const allSelected = group.members.every((m) =>
      state.members.some((sm) => sm.email === m.email)
    )
    if (allSelected) {
      group.members.forEach((m) => dispatch({ type: 'REMOVE_MEMBER', payload: m.email }))
    } else {
      group.members
        .filter((m) => !state.members.some((sm) => sm.email === m.email))
        .forEach((m) => dispatch({ type: 'ADD_MEMBER', payload: m }))
    }
  }

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
                aria-label="グループに追加"
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
              {isInGroup && <CheckIcon sx={{ fontSize: 18, color: 'primary.main', mr: 1 }} />}
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
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {groups.map((group) => {
              const allSelected = group.members.length > 0 && group.members.every((m) =>
                state.members.some((sm) => sm.email === m.email)
              )
              return (
                <Box key={group.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Chip
                    icon={<GroupsIcon sx={{ fontSize: 16 }} />}
                    label={group.name + '（' + group.members.length + '）'}
                    size="small"
                    color={allSelected ? 'primary' : 'default'}
                    variant={allSelected ? 'filled' : 'outlined'}
                    onClick={() => handleGroupSelect(group)}
                    sx={{ cursor: 'pointer' }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => setDeleteGroupTarget(group)}
                    sx={{ p: 0.3 }}
                    aria-label={`${group.name}を削除`}
                  >
                    <DeleteIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
              )
            })}
          </Box>
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
