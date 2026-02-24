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
} from '@mui/material'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import { useAppContext } from '../context/AppContext'
import { sendMessage } from '../hooks/useApi'
import { FavoriteMemberStorage } from '../../services/favorite-storage'
import type { Member } from '../../types'
import type { DirectoryPeopleResponse } from '../../types/api'

const favoriteStorage = new FavoriteMemberStorage()

export default function MemberPicker() {
  const { state, dispatch } = useAppContext()
  const [inputValue, setInputValue] = useState('')
  const [options, setOptions] = useState<Member[]>([])
  const [searching, setSearching] = useState(false)
  const [favorites, setFavorites] = useState<Member[]>([])
  const [favoriteEmails, setFavoriteEmails] = useState<Set<string>>(new Set())

  useEffect(() => {
    favoriteStorage.getAll().then((favs) => {
      setFavorites(favs)
      setFavoriteEmails(new Set(favs.map((f) => f.email)))
    })
  }, [])

  const refreshFavorites = async () => {
    const favs = await favoriteStorage.getAll()
    setFavorites(favs)
    setFavoriteEmails(new Set(favs.map((f) => f.email)))
  }

  const toggleFavorite = async (member: Member) => {
    if (favoriteEmails.has(member.email)) {
      await favoriteStorage.remove(member.email)
    } else {
      await favoriteStorage.add(member)
    }
    await refreshFavorites()
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

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

  const handleAddManualEmail = () => {
    if (inputValue && isValidEmail(inputValue)) {
      handleAddMember({ email: inputValue, name: inputValue })
    }
  }

  const filteredOptions = options.filter(
    (o) => !state.members.some((m) => m.email === o.email)
  )

  const unselectedFavorites = favorites.filter(
    (f) => !state.members.some((m) => m.email === f.email)
  )

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        メンバーを選択
      </Typography>

      {state.members.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
          {state.members.map((member) => (
            <Chip
              key={member.email}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                  {member.name}
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFavorite(member)
                    }}
                    sx={{ p: 0, ml: 0.3 }}
                  >
                    {favoriteEmails.has(member.email) ? (
                      <StarIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                    ) : (
                      <StarBorderIcon sx={{ fontSize: 16 }} />
                    )}
                  </IconButton>
                </Box>
              }
              size="small"
              onDelete={() =>
                dispatch({ type: 'REMOVE_MEMBER', payload: member.email })
              }
            />
          ))}
        </Box>
      )}

      {unselectedFavorites.length > 0 && (
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
            お気に入り
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {unselectedFavorites.map((fav) => (
              <Chip
                key={fav.email}
                label={fav.name}
                size="small"
                icon={<StarIcon sx={{ fontSize: 16, color: 'warning.main' }} />}
                onClick={() => handleAddMember(fav)}
                variant="outlined"
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Box>
        </Box>
      )}

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
        <Button size="small" onClick={handleAddManualEmail} sx={{ mb: 2 }}>
          「{inputValue}」を追加
        </Button>
      )}

      <Button
        variant="contained"
        fullWidth
        disabled={state.members.length === 0 && state.calendarIds.length === 0}
        onClick={() => dispatch({ type: 'SET_STEP', payload: 'config' })}
        sx={{ mt: 2 }}
      >
        次へ：検索条件を設定
      </Button>
    </Box>
  )
}
