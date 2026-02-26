import { createContext, useContext, useReducer, type ReactNode } from 'react'
import type { Purpose, Member, SearchConfig, AvailableSlot, Template } from '../../types'
import type { SearchHistoryEntry } from '../../services/search-history'

interface AppState {
  step: 'purpose' | 'members' | 'config' | 'results'
  purpose: Purpose | null
  members: Member[]
  calendarIds: string[]
  searchConfig: SearchConfig
  results: AvailableSlot[]
  excludedHolidays: string[]
  loading: boolean
  error: string | null
}

type Action =
  | { type: 'SET_PURPOSE'; payload: Purpose }
  | { type: 'SET_MEMBERS'; payload: Member[] }
  | { type: 'ADD_MEMBER'; payload: Member }
  | { type: 'REMOVE_MEMBER'; payload: string }
  | { type: 'SET_CALENDAR_IDS'; payload: string[] }
  | { type: 'SET_SEARCH_CONFIG'; payload: SearchConfig }
  | { type: 'SET_RESULTS'; payload: AvailableSlot[] }
  | { type: 'SET_EXCLUDED_HOLIDAYS'; payload: string[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_STEP'; payload: AppState['step'] }
  | { type: 'LOAD_TEMPLATE'; payload: Template }
  | { type: 'LOAD_HISTORY'; payload: SearchHistoryEntry }
  | { type: 'RESET' }

const defaultSearchConfig: SearchConfig = {
  dateRange: {
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  },
  daysOfWeek: [1, 2, 3, 4, 5],
  timeRange: { start: '09:00', end: '18:00' },
  minimumDurationMinutes: 30,
  excludeAllDayEvents: true,
  excludeHolidays: true,
}

const initialState: AppState = {
  step: 'purpose',
  purpose: null,
  members: [],
  calendarIds: [],
  searchConfig: defaultSearchConfig,
  results: [],
  excludedHolidays: [],
  loading: false,
  error: null,
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_PURPOSE':
      if (action.payload === 'personal') {
        return {
          ...state,
          purpose: action.payload,
          members: [],
          calendarIds: ['primary'],
          step: 'config',
        }
      }
      return { ...state, purpose: action.payload, step: 'members' }
    case 'SET_MEMBERS':
      return { ...state, members: action.payload }
    case 'ADD_MEMBER':
      return { ...state, members: [...state.members, action.payload] }
    case 'REMOVE_MEMBER':
      return { ...state, members: state.members.filter((m) => m.email !== action.payload) }
    case 'SET_CALENDAR_IDS':
      return { ...state, calendarIds: action.payload }
    case 'SET_SEARCH_CONFIG':
      return { ...state, searchConfig: action.payload }
    case 'SET_RESULTS':
      return { ...state, results: action.payload, step: 'results' }
    case 'SET_EXCLUDED_HOLIDAYS':
      return { ...state, excludedHolidays: action.payload }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'SET_STEP':
      return { ...state, step: action.payload }
    case 'LOAD_TEMPLATE': {
      const t = action.payload
      return {
        ...state,
        members: Array.isArray(t.members) ? t.members : [],
        calendarIds: Array.isArray(t.calendarIds) ? t.calendarIds : [],
        searchConfig: {
          ...defaultSearchConfig,
          ...(typeof t.searchConfig === 'object' && t.searchConfig !== null ? t.searchConfig : {}),
        },
      }
    }
    case 'LOAD_HISTORY': {
      const h = action.payload
      const members = Array.isArray(h.members) ? h.members : []
      return {
        ...state,
        members,
        calendarIds: Array.isArray(h.calendarIds) ? h.calendarIds : [],
        searchConfig: {
          ...defaultSearchConfig,
          ...(typeof h.searchConfig === 'object' && h.searchConfig !== null ? h.searchConfig : {}),
        },
        purpose: members.length > 0 ? 'meeting' : 'personal',
        step: 'config',
        results: [],
        excludedHolidays: [],
      }
    }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

const AppContext = createContext<{
  state: AppState
  dispatch: React.Dispatch<Action>
} | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used within AppProvider')
  return ctx
}
