import type { Messages } from './i18n'

export function formatBytes(bytes: number, t: Messages): string {
  const units = [
    t.units.bytes,
    t.units.kilobytes,
    t.units.megabytes,
    t.units.gigabytes,
    t.units.terabytes
  ]

  if (!Number.isFinite(bytes) || bytes <= 0) return `0 ${units[0]}`

  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }

  const decimals = unit === 0 ? 0 : value < 10 ? 2 : value < 100 ? 1 : 0
  return `${value.toFixed(decimals)} ${units[unit]}`
}

export function formatCount(value: number): string {
  return value.toLocaleString('en-US')
}

export function formatPercent(part: number, whole: number): string {
  if (whole <= 0) return '0%'
  const pct = (part / whole) * 100
  return pct < 0.1 ? '<0.1%' : `${pct.toFixed(pct < 10 ? 1 : 0)}%`
}

export function formatDate(iso: string | null, t: Messages): string {
  if (!iso) return t.date.never
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return t.date.unknown

  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000)
  if (days <= 0) return t.date.today
  if (days === 1) return t.date.yesterday
  if (days < 30) return t.date.daysAgo(days)
  return date.toLocaleDateString('en-CA')
}

export function formatMemory(mb: number | null, t: Messages): string {
  if (mb === null || mb <= 0) return t.common.launcherDefault
  return mb >= 1024
    ? `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} ${t.units.gigabytes}`
    : `${mb} ${t.units.megabytes}`
}
