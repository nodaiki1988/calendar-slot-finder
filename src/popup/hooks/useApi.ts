import type { MessageType, MessageResponse } from '../../types/chrome-messages'

export async function sendMessage<T>(
  message: MessageType
): Promise<T> {
  const response: MessageResponse<T> = await chrome.runtime.sendMessage(message)
  if (!response.success) {
    throw new Error(response.error)
  }
  return response.data
}
