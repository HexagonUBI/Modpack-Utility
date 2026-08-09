import { app } from 'electron'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import {
  DEFAULT_SETTINGS,
  LANGUAGES,
  type AccentName,
  type AppSettings,
  type DeleteMode,
  type ThemePreference
} from '@shared/types'

const VALID_ACCENTS: AccentName[] = ['red', 'green', 'blue', 'violet', 'amber', 'slate']
const VALID_THEMES: ThemePreference[] = ['system', 'light', 'dark']
const VALID_DELETE_MODES: DeleteMode[] = ['recycle', 'ask']

function settingsPath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

export async function readSettings(): Promise<AppSettings> {
  try {
    const raw = await readFile(settingsPath(), 'utf8')
    return coerce(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export async function writeSettings(patch: unknown): Promise<AppSettings> {
  const current = await readSettings()
  const merged = coerce({ ...current, ...(typeof patch === 'object' && patch !== null ? patch : {}) })

  const path = settingsPath()
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(merged, null, 2)}\n`, 'utf8')

  return merged
}

function coerce(value: unknown): AppSettings {
  const record = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>

  const theme = record['theme']
  const accent = record['accent']
  const language = record['language']
  const deleteMode = record['deleteMode']
  const extraFolders = record['extraFolders']

  return {
    theme: VALID_THEMES.includes(theme as ThemePreference)
      ? (theme as ThemePreference)
      : DEFAULT_SETTINGS.theme,
    accent: VALID_ACCENTS.includes(accent as AccentName)
      ? (accent as AccentName)
      : DEFAULT_SETTINGS.accent,
    language: LANGUAGES.some((entry) => entry.code === language)
      ? (language as string)
      : DEFAULT_SETTINGS.language,
    deleteMode: VALID_DELETE_MODES.includes(deleteMode as DeleteMode)
      ? (deleteMode as DeleteMode)
      : DEFAULT_SETTINGS.deleteMode,
    extraFolders: Array.isArray(extraFolders)
      ? extraFolders.filter((entry): entry is string => typeof entry === 'string')
      : []
  }
}
