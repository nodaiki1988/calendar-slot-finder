import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getAuthToken, revokeAuthToken } from '../auth'

describe('auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getAuthToken はトークンを返す', async () => {
    const mockGetAuthToken = vi.fn().mockResolvedValue({ token: 'test-token' })
    global.chrome = {
      ...global.chrome,
      identity: {
        ...global.chrome.identity,
        getAuthToken: mockGetAuthToken,
      },
    } as unknown as typeof chrome

    const token = await getAuthToken()
    expect(token).toBe('test-token')
    expect(mockGetAuthToken).toHaveBeenCalledWith({ interactive: true })
  })

  it('getAuthToken はエラー時にnullを返す', async () => {
    const mockGetAuthToken = vi.fn().mockRejectedValue(new Error('auth failed'))
    global.chrome = {
      ...global.chrome,
      identity: {
        ...global.chrome.identity,
        getAuthToken: mockGetAuthToken,
      },
    } as unknown as typeof chrome

    const token = await getAuthToken()
    expect(token).toBeNull()
  })
})
