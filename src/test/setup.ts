import '@testing-library/jest-dom'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).chrome = {
  identity: {
    getAuthToken: vi.fn(),
    removeCachedAuthToken: vi.fn(),
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
    },
    session: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
    },
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn((_query: unknown, callback: (tabs: unknown[]) => void) => callback([])),
    sendMessage: vi.fn(),
  },
}
