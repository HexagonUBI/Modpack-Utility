export type LauncherKind =
  | 'prism'
  | 'multimc'
  | 'curseforge'
  | 'modrinth'
  | 'atlauncher'
  | 'gdlauncher'
  | 'ftb'
  | 'technic'
  | 'vanilla'
  | 'server'
  | 'custom'

export const LAUNCHER_LABELS: Record<LauncherKind, string> = {
  prism: 'Prism Launcher',
  multimc: 'MultiMC',
  curseforge: 'CurseForge',
  modrinth: 'Modrinth',
  atlauncher: 'ATLauncher',
  gdlauncher: 'GDLauncher',
  ftb: 'FTB App',
  technic: 'Technic',
  vanilla: 'Vanilla Launcher',
  server: 'Dedicated Server',
  custom: 'Unrecognised'
}

export type LoaderKind = 'forge' | 'neoforge' | 'fabric' | 'quilt' | 'vanilla' | 'unknown'

export interface MemorySettings {
  minMb: number | null
  maxMb: number | null

  overridden: boolean
}

export interface Instance {
  id: string
  name: string

  rootPath: string

  gameDir: string
  launcher: LauncherKind
  minecraftVersion: string | null
  loader: LoaderKind | null
  loaderVersion: string | null

  iconDataUrl: string | null
  lastPlayedIso: string | null
  isServer: boolean
  memory: MemorySettings | null
  javaArgs: string | null

  source: 'auto' | 'manual'
}

export type ModLoaderType = 'fabric' | 'quilt' | 'forge' | 'neoforge' | 'legacy-forge' | 'unknown'

export type DependencyKind = 'required' | 'optional' | 'incompatible'

export interface ModDependency {
  modId: string
  versionRange: string | null
  kind: DependencyKind

  side: 'client' | 'server' | 'both' | null
}

export interface ModFile {
  filePath: string
  fileName: string
  sizeBytes: number

  enabled: boolean
  modifiedMs: number
  modId: string | null
  name: string | null
  version: string | null
  description: string | null
  authors: string[]
  homepage: string | null
  loaderType: ModLoaderType
  dependencies: ModDependency[]

  provides: string[]
  providedVersions: Record<string, string>

  resourceNamespaces: string[]

  bundledConfigNames: string[]
  environment: 'client' | 'server' | 'both' | null

  iconDataUrl: string | null

  problems: ModProblems
  parseError: string | null
}

export interface ModProblems {
  missing: string[]

  disabledDependencies: string[]

  conflictsWith: string[]
}

export function hasProblems(problems: ModProblems): boolean {
  return (
    problems.missing.length > 0 ||
    problems.disabledDependencies.length > 0 ||
    problems.conflictsWith.length > 0
  )
}

export interface ModsReport {
  modsDir: string
  exists: boolean
  mods: ModFile[]

  missingDependencies: MissingDependency[]

  conflicts: ModConflict[]
  totalBytes: number
  disabledBytes: number
}

export interface ModConflict {
  modId: string
  declaredBy: string

  versionRange: string | null
  installedVersion: string | null
}

export interface MissingDependency {
  modId: string
  versionRange: string | null
  requiredBy: string[]

  presentButDisabled: boolean
}

export type ConfigStatus = 'owned' | 'inactive' | 'orphaned' | 'system' | 'unmatched'

export const CONFIG_STATUS_LABELS: Record<ConfigStatus, string> = {
  owned: 'Active mod',
  inactive: 'Disabled mod',
  orphaned: 'No matching mod',
  system: 'Loader / system',
  unmatched: 'Unattributed'
}

export interface ConfigEntry {
  path: string

  relativePath: string
  isDirectory: boolean
  sizeBytes: number
  fileCount: number
  modifiedMs: number
  status: ConfigStatus
  ownerModId: string | null
  ownerModName: string | null

  confidence: number
  reason: string
}

export interface ConfigReport {
  configDir: string
  exists: boolean
  gameOptionsPath: string | null
  entries: ConfigEntry[]

  modsWithoutConfig: Array<{ modId: string; name: string }>
  totals: Record<ConfigStatus, number>

  reclaimableBytes: number
}

export type StorageCategory =
  | 'mods'
  | 'config'
  | 'saves'
  | 'resourcepacks'
  | 'shaderpacks'
  | 'logs'
  | 'crashes'
  | 'backups'
  | 'cache'
  | 'maps'
  | 'screenshots'
  | 'libraries'
  | 'versions'
  | 'other'

export const STORAGE_CATEGORY_LABELS: Record<StorageCategory, string> = {
  mods: 'Mods',
  config: 'Configs',
  saves: 'Worlds',
  resourcepacks: 'Resource packs',
  shaderpacks: 'Shader packs',
  logs: 'Logs',
  crashes: 'Crash reports',
  backups: 'Backups',
  cache: 'Caches',
  maps: 'Map data',
  screenshots: 'Screenshots',
  libraries: 'Libraries',
  versions: 'Versions',
  other: 'Other'
}

export const DISPOSABLE_CATEGORIES: StorageCategory[] = ['logs', 'crashes', 'cache']

export interface SizeNode {
  name: string
  path: string
  sizeBytes: number
  fileCount: number
  isDirectory: boolean
  category: StorageCategory

  children: SizeNode[] | null
}

export interface StorageReport {
  root: SizeNode
  scannedFiles: number
  scannedMs: number
  byCategory: Array<{ category: StorageCategory; sizeBytes: number; fileCount: number }>

  truncated: boolean
}

export interface InstanceAnalysis {
  mods: ModsReport
  configs: ConfigReport
}

export interface ResourcePackEntry {
  path: string
  name: string
  isDirectory: boolean
  sizeBytes: number

  enabled: boolean

  order: number | null
  description: string | null
  packFormat: number | null
  iconDataUrl: string | null
}

export interface ResourcePackReport {
  dir: string
  exists: boolean
  packs: ResourcePackEntry[]
  totalBytes: number
  enabledBytes: number
}

export interface ScreenshotEntry {
  path: string
  name: string
  sizeBytes: number
  modifiedMs: number
}

export interface ScreenshotReport {
  dir: string
  exists: boolean
  screenshots: ScreenshotEntry[]
  totalBytes: number
}

export interface TrashResult {
  path: string
  ok: boolean
  error: string | null
}

export interface ScanProgress {
  phase: 'launchers' | 'instance' | 'mods' | 'configs' | 'storage'
  message: string
  current: number
  total: number
}

export type SettingKind = 'boolean' | 'integer' | 'number' | 'string' | 'enum' | 'list'

export type SettingValue = string | number | boolean | string[]

export interface ConfigSetting {
  key: string

  label: string

  section: string | null
  description: string | null
  kind: SettingKind
  value: SettingValue
  min: number | null
  max: number | null
  options: string[] | null

  line: number
}

export type ConfigFormat = 'toml' | 'json' | 'properties' | 'unsupported'

export interface ConfigDocument {
  path: string
  fileName: string
  format: ConfigFormat
  settings: ConfigSetting[]

  unsupportedReason: string | null
}

export interface ConfigWriteResult {
  ok: boolean
  error: string | null

  skipped: string[]
}

export type AccentName = 'red' | 'green' | 'blue' | 'violet' | 'amber' | 'slate'

export const ACCENT_LABELS: Record<AccentName, string> = {
  red: 'Red',
  green: 'Green',
  blue: 'Blue',
  violet: 'Violet',
  amber: 'Amber',
  slate: 'Slate'
}

export type ThemePreference = 'system' | 'light' | 'dark'

export interface LanguageOption {
  code: string

  label: string
  translated: boolean
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', translated: true },
  { code: 'ru', label: 'Русский', translated: true },
  { code: 'uk', label: 'Українська', translated: true }
]

export interface AppSettings {
  theme: ThemePreference
  accent: AccentName
  language: string

  extraFolders: string[]
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  accent: 'red',
  language: 'en',
  extraFolders: []
}

export interface InstanceSize {
  id: string
  sizeBytes: number
  fileCount: number
}

export interface LauncherRoot {
  launcher: LauncherKind
  path: string
  instanceCount: number
}
