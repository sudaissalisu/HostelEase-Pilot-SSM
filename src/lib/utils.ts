import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow, isValid, parseISO } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function fmtDate(input: string | Date | null | undefined, fallback = "—"): string {
  if (!input) return fallback
  const d = typeof input === "string" ? parseISO(input) : input
  if (!isValid(d)) return fallback
  return format(d, "MMM d, yyyy")
}

export function fmtDateTime(input: string | Date | null | undefined, fallback = "—"): string {
  if (!input) return fallback
  const d = typeof input === "string" ? parseISO(input) : input
  if (!isValid(d)) return fallback
  return format(d, "MMM d, yyyy · h:mm a")
}

export function fmtRelative(input: string | Date | null | undefined, fallback = "—"): string {
  if (!input) return fallback
  const d = typeof input === "string" ? parseISO(input) : input
  if (!isValid(d)) return fallback
  return formatDistanceToNow(d, { addSuffix: true })
}

export function fmtMoney(n: number | null | undefined, currency = "NGN"): string {
  if (n === null || n === undefined) return "—"
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n)
}

/**
 * Shortened money formatter — compact for stat cards + tight spaces.
 *
 *   150000 → "₦150K"
 *   1500000 → "₦1.5M"
 *   1500 → "₦1.5K"
 *   500 → "₦500"
 *
 * Keeps the ₦ symbol for NGN, uses the currency code for others.
 */
export function fmtMoneyShort(n: number | null | undefined, currency = "NGN"): string {
  if (n === null || n === undefined) return "—"
  const prefix = currency === "NGN" ? "\u20A6" : `${currency} `
  const abs = Math.abs(n)
  if (abs >= 1_000_000) {
    return `${prefix}${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
  }
  if (abs >= 1_000) {
    return `${prefix}${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`
  }
  return `${prefix}${n.toLocaleString()}`
}


export function initials(name?: string | null): string {
  if (!name) return "?"
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("")
}

export function truncate(s: string, n = 80): string {
  if (s.length <= n) return s
  return s.slice(0, n - 1).trimEnd() + "…"
}

export function maskEmail(email?: string | null): string {
  if (!email) return ""
  const [user, domain] = email.split("@")
  if (!domain) return email
  const masked =
    user.length <= 2
      ? user[0] + "*"
      : user.slice(0, 2) + "*".repeat(Math.max(1, user.length - 4)) + user.slice(-2)
  return `${masked}@${domain}`
}

export function maskPhone(phone?: string | null): string {
  if (!phone) return ""
  if (phone.length < 4) return phone
  return phone.slice(0, 3) + "*".repeat(Math.max(0, phone.length - 6)) + phone.slice(-3)
}

export function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    return Promise.resolve(false)
  }
  return navigator.clipboard.writeText(text).then(() => true).catch(() => false)
}

export function downloadText(filename: string, text: string, mime = "text/plain") {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadJSON(filename: string, data: unknown) {
  downloadText(filename, JSON.stringify(data, null, 2), "application/json")
}

export function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ""
  const headers = Array.from(
    rows.reduce<Set<string>>((set, row) => {
      Object.keys(row).forEach((k) => set.add(k))
      return set
    }, new Set())
  )
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return ""
    const s = String(v).replace(/"/g, '""')
    return /[",\n]/.test(s) ? `"${s}"` : s
  }
  const lines = [headers.join(",")]
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","))
  }
  return lines.join("\n")
}

export function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize
  const slice = items.slice(start, start + pageSize)
  return {
    items: slice,
    page,
    pageSize,
    total: items.length,
    totalPages: Math.max(1, Math.ceil(items.length / pageSize)),
  }
}

export function daysUntil(d: Date | string | null | undefined): number | null {
  if (!d) return null
  const date = typeof d === 'string' ? new Date(d) : d
  const diff = date.getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}
