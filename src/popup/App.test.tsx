import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('タイトルが表示される', () => {
    render(<App />)
    expect(screen.getByText('Calendar Slot Finder')).toBeInTheDocument()
  })
})
