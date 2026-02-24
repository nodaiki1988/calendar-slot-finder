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
      await fetch(
        `https://accounts.google.com/o/oauth2/revoke?token=${encodeURIComponent(result.token)}`
      ).catch(() => {})
    }
  } catch {
    // ignore
  }
}
