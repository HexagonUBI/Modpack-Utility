import type { StorageCategory } from '@shared/types'
import type { ThemeMode } from './theme'

export type VizGroup =
  | 'mods'
  | 'saves'
  | 'resourcepacks'
  | 'shaderpacks'
  | 'maps'
  | 'backups'
  | 'cache'
  | 'logs'
  | 'other'

export const VIZ_GROUP_ORDER: VizGroup[] = [
  'mods',
  'saves',
  'resourcepacks',
  'shaderpacks',
  'maps',
  'backups',
  'cache',
  'logs',
  'other'
]

export const VIZ_GROUP_LABELS: Record<VizGroup, string> = {
  mods: 'Mods',
  saves: 'Worlds',
  resourcepacks: 'Resource packs',
  shaderpacks: 'Shader packs',
  maps: 'Map data',
  backups: 'Backups',
  cache: 'Caches',
  logs: 'Logs & crashes',
  other: 'Other'
}

const CATEGORY_TO_GROUP: Record<StorageCategory, VizGroup> = {
  mods: 'mods',
  saves: 'saves',
  resourcepacks: 'resourcepacks',
  shaderpacks: 'shaderpacks',
  maps: 'maps',
  backups: 'backups',
  cache: 'cache',
  logs: 'logs',
  crashes: 'logs',
  config: 'other',
  screenshots: 'other',
  libraries: 'other',
  versions: 'other',
  other: 'other'
}

const GROUP_COLOURS: Record<VizGroup, Record<ThemeMode, string>> = {
  mods: { light: '#2a78d6', dark: '#3987e5' },
  saves: { light: '#eb6834', dark: '#d95926' },
  resourcepacks: { light: '#1baf7a', dark: '#199e70' },
  shaderpacks: { light: '#eda100', dark: '#c98500' },
  maps: { light: '#e87ba4', dark: '#d55181' },
  backups: { light: '#008300', dark: '#008300' },
  cache: { light: '#4a3aa7', dark: '#9085e9' },
  logs: { light: '#e34948', dark: '#e66767' },
  other: { light: '#898781', dark: '#898781' }
}

export function groupForCategory(category: StorageCategory): VizGroup {
  return CATEGORY_TO_GROUP[category] ?? 'other'
}

export function colourForCategory(category: StorageCategory, mode: ThemeMode): string {
  return GROUP_COLOURS[groupForCategory(category)][mode]
}

export function colourForGroup(group: VizGroup, mode: ThemeMode): string {
  return GROUP_COLOURS[group][mode]
}

const CATEGORICAL_SLOTS: Array<Record<ThemeMode, string>> = [
  GROUP_COLOURS.mods,
  GROUP_COLOURS.saves,
  GROUP_COLOURS.resourcepacks,
  GROUP_COLOURS.shaderpacks,
  GROUP_COLOURS.maps,
  GROUP_COLOURS.backups,
  GROUP_COLOURS.cache,
  GROUP_COLOURS.logs
]

export const CATEGORICAL_SLOT_COUNT = CATEGORICAL_SLOTS.length

export function categoricalColour(index: number, mode: ThemeMode): string {
  return (CATEGORICAL_SLOTS[index] ?? GROUP_COLOURS.other)[mode]
}

export function inkOnFill(hex: string): string {
  const value = hex.replace('#', '')
  const r = Number.parseInt(value.slice(0, 2), 16) / 255
  const g = Number.parseInt(value.slice(2, 4), 16) / 255
  const b = Number.parseInt(value.slice(4, 6), 16) / 255

  const channel = (c: number): number => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const luminance = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)

  return luminance > 0.45 ? '#0b0b0b' : '#ffffff'
}
