import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'

const theme = createTheme({
  palette: {
    primary: { main: '#1a73e8' },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
})

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div style={{ width: 400, minHeight: 500, padding: 16 }}>
        <h1>Calendar Slot Finder</h1>
      </div>
    </ThemeProvider>
  )
}
