export async function getAuthToken(): Promise<string | null> {
  try {
    const result = await chrome.identity.getAuthToken({ interactive: true })
    return result.token ?? null
  } catch {
    return null
  }
}

export async function revokeAuthToken(): Promise<void> {
  try {
    const result = await chrome.identity.getAuthToken({ interactive: false })
    if (result.token) {
      await chrome.identity.removeCachedAuthToken({ token: result.token })
      await fetch('https://oauth2.googleapis.com/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `token=${encodeURIComponent(result.token)}`,
      }).catch((error) => {
        console.warn('Failed to revoke token via OAuth2 endpoint:', error)
      })
    }
  } catch {
    // ignore
  }
}
