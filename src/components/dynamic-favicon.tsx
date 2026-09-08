'use client'

import { useEffect } from 'react'
import useSWR from 'swr'

/**
 * DynamicFavicon — updates the browser tab favicon + page title from the
 * branding settings stored in the SSM database.
 *
 * Reads `favicon_url` and `pwa_icon_url` from /api/branding and sets
 * <link rel="icon"> accordingly. Also updates the document title with
 * the school short name if set.
 */
export function DynamicFavicon() {
  const { data } = useSWR<{ branding: Record<string, string> }>('/api/branding', (url: string) =>
    fetch(url, { credentials: 'include' }).then((r) => r.ok ? r.json() : { branding: {} })
  )

  const branding = data?.branding || {}
  const faviconUrl = branding.favicon_url || branding.pwa_icon_url || branding.school_logo_url || ''
  const shortName = branding.institution_short_name || branding.school_name || ''

  useEffect(() => {
    if (!faviconUrl) return
    // Remove existing favicon links
    const existing = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]')
    existing.forEach((el) => el.remove())

    // Add new favicon
    const link = document.createElement('link')
    link.rel = 'icon'
    link.href = faviconUrl
    document.head.appendChild(link)

    // Also add apple-touch-icon for PWA
    const appleLink = document.createElement('link')
    appleLink.rel = 'apple-touch-icon'
    appleLink.href = faviconUrl
    document.head.appendChild(appleLink)
  }, [faviconUrl])

  useEffect(() => {
    if (shortName) {
      document.title = `${shortName} — SSM Pilot | HostelEase Management`
    }
  }, [shortName])

  return null
}
