import { useState } from 'react'
import {
  Box,
  TextField,
  Autocomplete,
  Chip,
  Typography,
  Button,
  CircularProgress,
} from '@mui/material'
import { useAppContext } from '../context/AppContext'
import { sendMessage } from '../hooks/useApi'
import type { Member } from '../../types'
import type { DirectoryPeopleResponse } from '../../types/api'

export default function MemberPicker() {
  const { state, dispatch } = useAppContext()
  const [inputValue, setInputValue] = useState('')
  const [options, setOptions] = useState<Member[]>([])
  const [searching, setSearching] = useState(false)

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

  const handleAddManualEmail = () => {
    if (inputValue && inputValue.includes('@')) {
      dispatch({
        type: 'ADD_MEMBER',
        payload: { email: inputValue, name: inputValue },
      })
      setInputValue('')
    }
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        メンバーを選択
      </Typography>

      <Autocomplete
        multiple
        options={options}
        getOptionLabel={(o) => `${o.name} (${o.email})`}
        value={state.members}
        onChange={(_e, newValue) => dispatch({ type: 'SET_MEMBERS', payload: newValue })}
        inputValue={inputValue}
        onInputChange={(_e, value) => {
          setInputValue(value)
          handleSearch(value)
        }}
        loading={searching}
        renderTags={(value, getTagProps) =>
          value.map((member, index) => (
            <Chip
              {...getTagProps({ index })}
              key={member.email}
              label={member.name}
              size="small"
            />
          ))
        }
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

      {inputValue.includes('@') && (
        <Button size="small" onClick={handleAddManualEmail} sx={{ mb: 2 }}>
          「{inputValue}」を追加
        </Button>
      )}

      <Button
        variant="contained"
        fullWidth
        disabled={state.members.length === 0}
        onClick={() => dispatch({ type: 'SET_STEP', payload: 'config' })}
        sx={{ mt: 2 }}
      >
        次へ：検索条件を設定
      </Button>
    </Box>
  )
}
