export async function getAuthToken(): Promise<string | null> {
  try {
    const result = await chrome.identity.getAuthToken({ interactive: true })
    return result.token
  } catch {
    return null
  }
}

export async function revokeAuthToken(): Promise<void> {
  try {
    const result = await chrome.identity.getAuthToken({ interactive: false })
    if (result.token) {
      await chrome.identity.removeCachedAuthToken({ token: result.token })
    }
  } catch {
    // ignore
  }
}
