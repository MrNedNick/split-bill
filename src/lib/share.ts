import { Share } from 'react-native'

/**
 * Native share sheet. The web build gets a different implementation from
 * `share.web.ts` — react-native-web has no Share, and the browser's own
 * `navigator.share` is not available everywhere either.
 */
export async function shareText(text: string, title: string): Promise<'shared' | 'dismissed'> {
  const result = await Share.share({ message: text, title })
  return result.action === Share.dismissedAction ? 'dismissed' : 'shared'
}

export type ShareMethod = 'share sheet' | 'clipboard'

export const shareMethod: ShareMethod = 'share sheet'
