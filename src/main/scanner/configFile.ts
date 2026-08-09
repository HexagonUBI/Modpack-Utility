import { readFile, writeFile } from 'node:fs/promises'
import { basename } from 'node:path'
import type {
  ConfigDocument,
  ConfigFormat,
  ConfigSetting,
  ConfigWriteResult,
  SettingKind,
  SettingValue
} from '@shared/types'
import { parseJsonLoose, readTextFile } from './fsutil'

const MAX_CONFIG_BYTES = 2 * 1024 * 1024
const MAX_SETTINGS = 400

export async function readConfigDocument(path: string): Promise<ConfigDocument> {
  const fileName = basename(path)

  const base: ConfigDocument = {
    path,
    fileName,
    format: formatOf(fileName),
    settings: [],
    unsupportedReason: null
  }

  if (base.format === 'unsupported') {
    return { ...base, unsupportedReason: 'fileType' }
  }

  const text = await readTextFile(path)
  if (text === null) return { ...base, unsupportedReason: 'unreadable' }
  if (text.length > MAX_CONFIG_BYTES) {
    return { ...base, unsupportedReason: 'tooLarge' }
  }

  const format = formatOf(fileName, text)
  base.format = format

  const settings =
    format === 'toml'
      ? parseTomlSettings(text)
      : format === 'properties'
        ? parsePropertiesSettings(text, detectSeparator(text))
        : parseJsonSettings(text)

  if (settings === null) {
    return { ...base, unsupportedReason: 'notUnderstood' }
  }
  if (settings.length === 0) {
    return { ...base, unsupportedReason: 'noOptions' }
  }

  if (fileName.toLowerCase().endsWith('.txt') && settings.length < 3) {
    return { ...base, unsupportedReason: 'notSettings' }
  }

  return { ...base, settings: settings.slice(0, MAX_SETTINGS) }
}

export async function writeConfigChanges(
  path: string,
  changes: Array<{ key: string; value: SettingValue }>
): Promise<ConfigWriteResult> {
  if (changes.length === 0) return { ok: true, error: null, detail: null, skipped: [] }

  try {
    const text = await readTextFile(path)
    if (text === null) return { ok: false, error: 'failed', detail: null, skipped: [] }

    const format = formatOf(basename(path), text)
    if (format === 'json') return await writeJsonChanges(path, changes)
    if (format === 'unsupported') {
      return { ok: false, error: 'fileType', detail: null, skipped: [] }
    }

    return await writeLineChanges(path, format, changes)
  } catch (error) {
    return {
      ok: false,
      error: 'failed',
      detail: error instanceof Error ? error.message : null,
      skipped: []
    }
  }
}

const JSON_EXTENSION = /\.(json|json5|jsonc)$/i
const LINE_EXTENSION = /\.(properties|cfg|txt|ini|conf|hocon|yaml|yml)$/i

function formatOf(fileName: string, text?: string): ConfigFormat {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.toml')) return 'toml'
  if (JSON_EXTENSION.test(lower)) return 'json'

  if (LINE_EXTENSION.test(lower)) {
    return text !== undefined && looksLikeJson(text) ? 'json' : 'properties'
  }
  return 'unsupported'
}

function looksLikeJson(text: string): boolean {
  const trimmed = text.replace(/^\uFEFF/, '').trimStart()
  return trimmed.startsWith('{') || trimmed.startsWith('[')
}

const RANGE_BETWEEN = /Range:\s*(-?[\d.]+)\s*~\s*(-?[\d.]+)/i
const RANGE_BOUND = /Range:\s*(>=|<=|>|<)\s*(-?[\d.]+)/i
const ALLOWED_VALUES = /Allowed Values:\s*(.+)$/i

function parseTomlSettings(text: string): ConfigSetting[] {
  const lines = text.split(/\r?\n/)
  const settings: ConfigSetting[] = []

  let section: string | null = null
  let comments: string[] = []
  let min: number | null = null
  let max: number | null = null
  let options: string[] | null = null

  const resetContext = (): void => {
    comments = []
    min = null
    max = null
    options = null
  }

  for (const [index, raw] of lines.entries()) {
    const line = raw.trim()

    if (line.length === 0) {
      resetContext()
      continue
    }

    if (line.startsWith('#')) {
      const comment = line.replace(/^#+\s?/, '')

      const between = RANGE_BETWEEN.exec(comment)
      if (between) {
        min = Number(between[1])
        max = Number(between[2])
        continue
      }

      const bound = RANGE_BOUND.exec(comment)
      if (bound) {
        const value = Number(bound[2])
        if (bound[1]!.startsWith('>')) min = value
        else max = value
        continue
      }

      const allowed = ALLOWED_VALUES.exec(comment)
      if (allowed) {
        options = allowed[1]!
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean)
        continue
      }

      comments.push(comment)
      continue
    }

    if (line.startsWith('[')) {
      section = line.replace(/^\[+/, '').replace(/\]+.*$/, '').trim() || null
      resetContext()
      continue
    }

    const equals = line.indexOf('=')
    if (equals <= 0) {
      resetContext()
      continue
    }

    const label = line.slice(0, equals).trim().replace(/^["']|["']$/g, '')
    const rawValue = stripTrailingComment(line.slice(equals + 1)).trim()
    const parsed = parseTomlValue(rawValue)
    if (label.length === 0 || parsed === null) {
      resetContext()
      continue
    }

    settings.push({
      key: section ? `${section}.${label}` : label,
      label,
      section,
      description: comments.length > 0 ? comments.join(' ') : null,
      kind: options && typeof parsed === 'string' ? 'enum' : kindOf(parsed),
      value: parsed,
      min,
      max,
      options: typeof parsed === 'string' ? options : null,
      line: index
    })

    resetContext()
  }

  return settings
}

function parseTomlValue(raw: string): SettingValue | null {
  if (raw.length === 0) return null
  if (raw === 'true') return true
  if (raw === 'false') return false

  if (raw.startsWith('[')) {
    if (!raw.endsWith(']')) return null
    const inner = raw.slice(1, -1).trim()
    if (inner.length === 0) return []

    if (inner.includes('[') || inner.includes('{')) return null
    return inner.split(',').map((entry) => unquote(entry.trim()))
  }

  if (raw.startsWith('"') || raw.startsWith("'")) return unquote(raw)

  if (/^-?\d+$/.test(raw)) return Number.parseInt(raw, 10)
  if (/^-?\d*\.\d+$/.test(raw)) return Number.parseFloat(raw)

  return null
}

const KNOWN_OPTION_RANGES: Record<string, { min: number; max: number }> = {
  renderDistance: { min: 2, max: 32 },
  simulationDistance: { min: 5, max: 32 },
  entityDistanceScaling: { min: 0.5, max: 5 },
  biomeBlendRadius: { min: 0, max: 7 },
  maxFps: { min: 10, max: 260 },
  guiScale: { min: 0, max: 4 },
  particles: { min: 0, max: 2 },
  graphicsMode: { min: 0, max: 2 },
  ao: { min: 0, max: 2 },
  mouseSensitivity: { min: 0, max: 1 },
  gamma: { min: 0, max: 1 },
  chatOpacity: { min: 0, max: 1 },
  chatScale: { min: 0, max: 1 },
  chatHeightFocused: { min: 0, max: 1 },
  chatHeightUnfocused: { min: 0, max: 1 },
  textBackgroundOpacity: { min: 0, max: 1 },
  fovEffectScale: { min: 0, max: 1 },
  screenEffectScale: { min: 0, max: 1 },
  darknessEffectScale: { min: 0, max: 1 },
  glintSpeed: { min: 0, max: 1 },
  glintStrength: { min: 0, max: 1 },
  damageTiltStrength: { min: 0, max: 1 },
  mipmapLevels: { min: 0, max: 4 }
}

function detectSeparator(text: string): ':' | '=' {
  let colons = 0
  let equals = 0

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (line.length === 0 || line.startsWith('#') || line.startsWith('!')) continue

    const colon = line.indexOf(':')
    const equal = line.indexOf('=')
    if (equal > 0 && (colon < 0 || equal < colon)) equals++
    else if (colon > 0) colons++
  }

  return colons > equals ? ':' : '='
}

function parsePropertiesSettings(text: string, separator: string = '='): ConfigSetting[] {
  const lines = text.split(/\r?\n/)
  const settings: ConfigSetting[] = []
  let comments: string[] = []

  for (const [index, raw] of lines.entries()) {
    const line = raw.trim()

    if (line.length === 0) {
      comments = []
      continue
    }
    if (line.startsWith('#') || line.startsWith('!')) {
      comments.push(line.replace(/^[#!]+\s?/, ''))
      continue
    }

    const at = line.indexOf(separator)
    if (at <= 0) {
      comments = []
      continue
    }

    const label = line.slice(0, at).trim()
    const rawValue = line.slice(at + 1).trim()
    const value = parseScalarOrList(rawValue)
    const range = KNOWN_OPTION_RANGES[label]

    settings.push({
      key: label,
      label,
      section: null,
      description: comments.length > 0 ? comments.join(' ') : null,
      kind: kindOf(value),
      value,
      min: typeof value === 'number' ? (range?.min ?? null) : null,
      max: typeof value === 'number' ? (range?.max ?? null) : null,
      options: null,
      line: index
    })

    comments = []
  }

  return settings
}

function parseScalarOrList(raw: string): SettingValue {
  if (raw === 'true') return true
  if (raw === 'false') return false
  if (/^-?\d+$/.test(raw)) return Number.parseInt(raw, 10)
  if (/^-?\d*\.\d+([eE][-+]?\d+)?$/.test(raw)) return Number.parseFloat(raw)

  if (raw.startsWith('[') && raw.endsWith(']')) {
    const parsed = parseJsonLoose<unknown>(raw)
    if (Array.isArray(parsed) && parsed.every((entry) => typeof entry === 'string')) {
      return parsed as string[]
    }
  }

  if (raw.length >= 2 && raw.startsWith("'") && raw.endsWith("'")) return raw.slice(1, -1)

  return raw
}

function parseJsonSettings(text: string): ConfigSetting[] | null {
  const json = parseJsonLoose<unknown>(text)
  if (typeof json !== 'object' || json === null || Array.isArray(json)) return null

  const settings: ConfigSetting[] = []

  const walk = (node: Record<string, unknown>, prefix: string, section: string | null): void => {
    for (const [label, value] of Object.entries(node)) {
      const key = prefix ? `${prefix}.${label}` : label

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        walk(value as Record<string, unknown>, key, key)
        continue
      }

      if (Array.isArray(value)) {
        if (value.some((entry) => typeof entry === 'object' && entry !== null)) continue
        settings.push(makeSetting(key, label, section, value.map(String), 'list'))
        continue
      }

      if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
        settings.push(makeSetting(key, label, section, value, kindOf(value)))
      }
    }
  }

  walk(json as Record<string, unknown>, '', null)
  return settings
}

function makeSetting(
  key: string,
  label: string,
  section: string | null,
  value: SettingValue,
  kind: SettingKind
): ConfigSetting {
  return {
    key,
    label,
    section,
    description: null,
    kind,
    value,
    min: null,
    max: null,
    options: null,

    line: -1
  }
}

async function writeLineChanges(
  path: string,
  format: ConfigFormat,
  changes: Array<{ key: string; value: SettingValue }>
): Promise<ConfigWriteResult> {
  const original = await readFile(path, 'utf8')
  const newline = original.includes('\r\n') ? '\r\n' : '\n'
  const lines = original.split(/\r?\n/)
  const separator = format === 'toml' ? '=' : detectSeparator(original)

  const current =
    format === 'toml' ? parseTomlSettings(original) : parsePropertiesSettings(original, separator)
  const byKey = new Map(current.map((setting) => [setting.key, setting]))

  const skipped: string[] = []
  let changed = 0

  for (const change of changes) {
    const setting = byKey.get(change.key)
    if (!setting || setting.line < 0 || setting.line >= lines.length) {
      skipped.push(change.key)
      continue
    }

    const line = lines[setting.line]!
    const at = line.indexOf(separator)
    if (at <= 0) {
      skipped.push(change.key)
      continue
    }

    const rendered = format === 'toml' ? renderTomlValue(change.value) : renderPlainValue(change.value)

    const keyPart = line.slice(0, at + 1)
    const valuePart = line.slice(at + 1)
    const trailingComment = format === 'toml' ? extractTrailingComment(valuePart) : ''
    const leadingSpace = format === 'toml' ? (/^\s*/.exec(valuePart)?.[0] ?? ' ') : ''

    lines[setting.line] = `${keyPart}${leadingSpace}${rendered}${trailingComment}`
    changed++
  }

  if (changed > 0) await writeFile(path, lines.join(newline), 'utf8')

  return {
    ok: skipped.length === 0,
    error: skipped.length === 0 ? null : 'stale',
    detail: null,
    skipped
  }
}

async function writeJsonChanges(
  path: string,
  changes: Array<{ key: string; value: SettingValue }>
): Promise<ConfigWriteResult> {
  const text = await readFile(path, 'utf8')
  const json = parseJsonLoose<Record<string, unknown>>(text)
  if (typeof json !== 'object' || json === null) {
    return { ok: false, error: 'unparsable', detail: null, skipped: changes.map((c) => c.key) }
  }

  const skipped: string[] = []

  for (const change of changes) {
    const parts = change.key.split('.')
    let node: Record<string, unknown> = json
    let ok = true

    for (const part of parts.slice(0, -1)) {
      const next = node[part]
      if (typeof next !== 'object' || next === null || Array.isArray(next)) {
        ok = false
        break
      }
      node = next as Record<string, unknown>
    }

    if (!ok) {
      skipped.push(change.key)
      continue
    }
    node[parts[parts.length - 1]!] = change.value
  }

  await writeFile(path, `${JSON.stringify(json, null, 2)}\n`, 'utf8')

  return {
    ok: skipped.length === 0,
    error: skipped.length === 0 ? null : 'missingKeys',
    detail: null,
    skipped
  }
}

function kindOf(value: SettingValue): SettingKind {
  if (typeof value === 'boolean') return 'boolean'
  if (Array.isArray(value)) return 'list'
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number'
  return 'string'
}

function renderTomlValue(value: SettingValue): string {
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) return `[${value.map((entry) => `"${escapeToml(entry)}"`).join(', ')}]`
  return `"${escapeToml(value)}"`
}

function renderPlainValue(value: SettingValue): string {
  if (Array.isArray(value)) return JSON.stringify(value)
  return String(value)
}

function escapeToml(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function unquote(value: string): string {
  const quoted = /^(["'])([\s\S]*)\1$/.exec(value)
  return quoted ? (quoted[2] ?? '') : value
}

function extractTrailingComment(valuePart: string): string {
  let inString: string | null = null

  for (let i = 0; i < valuePart.length; i++) {
    const char = valuePart[i]
    if (inString) {
      if (char === '\\') i++
      else if (char === inString) inString = null
      continue
    }
    if (char === '"' || char === "'") {
      inString = char
      continue
    }
    if (char === '#') return valuePart.slice(i - (valuePart[i - 1] === ' ' ? 1 : 0))
  }

  return ''
}

function stripTrailingComment(valuePart: string): string {
  const comment = extractTrailingComment(valuePart)
  return comment.length > 0 ? valuePart.slice(0, valuePart.length - comment.length) : valuePart
}
