export interface VersionEntry {
  version: string
  date: string
  title: string
  changes: string[]
}

const FALLBACK_CHANGELOG: VersionEntry[] = [
  {
    version: '1.0.0',
    date: '2024-10-01',
    title: 'Initial Release',
    changes: ['HostelEase platform deployed'],
  },
]

export function getCurrentVersion(): string {
  return FALLBACK_CHANGELOG[FALLBACK_CHANGELOG.length - 1]?.version || '1.0.0'
}

export function getCurrentVersionEntry(): VersionEntry {
  return FALLBACK_CHANGELOG[FALLBACK_CHANGELOG.length - 1] || FALLBACK_CHANGELOG[0]
}

export function getFullChangelog(): VersionEntry[] {
  return FALLBACK_CHANGELOG
}

export function formatVersionEntry(entry: VersionEntry): string {
  const date = new Date(entry.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  return `v${entry.version} — ${entry.title} (${date})`
}
