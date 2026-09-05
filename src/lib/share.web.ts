/**
 * The web half of `share.ts`, picked up by the bundler through the `.web`
 * extension. Browsers that support the Web Share API get the same sheet a phone
 * shows; the rest fall back to the clipboard, which is what a person would do
 * by hand anyway.
 */
export async function shareText(text: string, title: string): Promise<'shared' | 'dismissed'> {
  if (typeof navigator !== 'undefined' && 'share' in navigator) {
    try {
      await navigator.share({ text, title })
      return 'shared'
    } catch {
      // Cancelled, or blocked outside a user gesture: fall through to copying.
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(text)
    return 'shared'
  }

  return 'dismissed'
}

export type ShareMethod = 'share sheet' | 'clipboard'

export const shareMethod: ShareMethod = 'clipboard'
