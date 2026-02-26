import type { MessageType, MessageResponse } from '../../types/chrome-messages'

export async function sendMessage<T>(
  message: MessageType
): Promise<T> {
  let response: unknown
  try {
    response = await chrome.runtime.sendMessage(message)
  } catch (error) {
    throw new Error(
      `バックグラウンドスクリプトとの通信に失敗しました: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  if (typeof response !== 'object' || response === null) {
    throw new Error('バックグラウンドスクリプトから無効なレスポンスを受信しました')
  }

  const msgResp = response as MessageResponse<T>
  if (!msgResp.success) {
    throw new Error(msgResp.error ?? '不明なエラー')
  }
  return msgResp.data
}
