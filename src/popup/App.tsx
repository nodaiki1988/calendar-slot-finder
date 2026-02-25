import { useEffect, useState } from 'react'
import { ThemeProvider, createTheme, CssBaseline, Box, IconButton, Typography, Button, Stepper, Step, StepLabel } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { AppProvider, useAppContext } from './context/AppContext'
import PurposeSelector from './components/PurposeSelector'
import MemberPicker from './components/MemberPicker'
import CalendarPicker from './components/CalendarPicker'
import SearchConfigForm from './components/SearchConfigForm'
import ResultList from './components/ResultList'
import TemplateManager from './components/TemplateManager'

const theme = createTheme({
  palette: {
    primary: { main: '#1a73e8' },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: { borderRadius: 12 },
})

function parseDateFromCalendarUrl(url: string): string | null {
  // /calendar/r/week/2026/2/23, /calendar/r/day/2026/2/23 等からYYYY-MM-DD取得
  const match = url.match(/\/calendar\/r\/\w+\/(\d{4})\/(\d{1,2})\/(\d{1,2})/)
  if (match) {
    const [, y, m, d] = match
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return null
}

function AppContent() {
  const { state, dispatch } = useAppContext()
  const [isSidePanel, setIsSidePanel] = useState(window.innerWidth > 500)

  useEffect(() => {
    const handleResize = () => setIsSidePanel(window.innerWidth > 500)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url
      if (url) {
        const date = parseDateFromCalendarUrl(url)
        if (date) {
          dispatch({
            type: 'SET_SEARCH_CONFIG',
            payload: {
              ...state.searchConfig,
              dateRange: { start: date, end: date },
            },
          })
        }
      }
    })
  }, [])

  const handleBack = () => {
    if (state.purpose === 'personal' && state.step === 'config') {
      dispatch({ type: 'SET_STEP', payload: 'purpose' })
      return
    }
    const steps: Array<typeof state.step> = ['purpose', 'members', 'config', 'results']
    const idx = steps.indexOf(state.step)
    if (idx > 0) dispatch({ type: 'SET_STEP', payload: steps[idx - 1] })
  }

  return (
    <Box sx={{ width: isSidePanel ? '100%' : 400, minHeight: 500, maxHeight: isSidePanel ? '100vh' : 600, p: 2, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexShrink: 0 }}>
        {state.step !== 'purpose' && (
          <IconButton onClick={handleBack} size="small" sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
        )}
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
          Calendar Slot Finder
        </Typography>
      </Box>

      {state.step !== 'purpose' && (() => {
        const isPersonal = state.purpose === 'personal'
        const steps = isPersonal
          ? ['目的選択', '検索条件', '検索結果']
          : ['目的選択', 'メンバー選択', '検索条件', '検索結果']
        const stepMap = isPersonal
          ? { purpose: 0, config: 1, results: 2 }
          : { purpose: 0, members: 1, config: 2, results: 3 }
        const activeStep = stepMap[state.step as keyof typeof stepMap] ?? 0
        return (
          <Stepper activeStep={activeStep} alternativeLabel sx={{ py: 0.5, mb: 1, flexShrink: 0 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel slotProps={{ label: { sx: { fontSize: '0.7rem' } } }}>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        )
      })()}

      {state.step === 'purpose' && <PurposeSelector />}
      {state.step === 'members' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <Box sx={{ flex: 1, overflowY: 'auto', pb: 1 }}>
            <MemberPicker />
            <CalendarPicker />
            <TemplateManager />
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
            <Button
              variant="contained"
              fullWidth
              disabled={state.members.length === 0 && state.calendarIds.length === 0}
              onClick={() => dispatch({ type: 'SET_STEP', payload: 'config' })}
            >
              次へ：検索条件を設定
            </Button>
          </Box>
        </Box>
      )}
      {state.step === 'config' && <SearchConfigForm />}
      {state.step === 'results' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <ResultList />
        </Box>
      )}
    </Box>
  )
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ThemeProvider>
  )
}
