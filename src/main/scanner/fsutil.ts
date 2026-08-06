import { readFile, readdir, stat } from 'node:fs/promises'
import { createHash } from 'node:crypto'

export async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory()
  } catch {
    return false
  }
}

export async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile()
  } catch {
    return false
  }
}

export async function listDirectories(path: string): Promise<string[]> {
  try {
    const entries = await readdir(path, { withFileTypes: true })
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)
  } catch {
    return []
  }
}

export async function readTextFile(path: string): Promise<string | null> {
  try {
    const text = await readFile(path, 'utf8')
    return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  } catch {
    return null
  }
}

export async function readJsonFile<T = unknown>(path: string): Promise<T | null> {
  const text = await readTextFile(path)
  if (text === null) return null
  return parseJsonLoose<T>(text)
}

export function parseJsonLoose<T = unknown>(text: string): T | null {
  try {
    return JSON.parse(text) as T
  } catch {
  }

  try {
    return JSON.parse(stripJsonExtras(text)) as T
  } catch {
    return null
  }
}

function stripJsonExtras(text: string): string {
  let out = ''
  let inString = false
  let escaped = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!

    if (inString) {
      if (escaped) {
        escaped = false
      } else if (ch === '\\') {
        escaped = true
      } else if (ch === '"') {
        inString = false
      } else if (ch === '\n' || ch === '\r') {
        out += '\\n'
        continue
      }
      out += ch
      continue
    }

    if (ch === '"') {
      inString = true
      out += ch
      continue
    }
    if (ch === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++
      out += '\n'
      continue
    }
    if (ch === '/' && text[i + 1] === '*') {
      i += 2
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++
      i++
      continue
    }
    out += ch
  }

  return out.replace(/,(\s*[}\]])/g, '$1')
}

export async function readKeyValueFile(path: string): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  const text = await readTextFile(path)
  if (text === null) return result

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (line.length === 0 || line.startsWith('#') || line.startsWith('!') || line.startsWith('[')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    result.set(line.slice(0, eq).trim(), line.slice(eq + 1).trim())
  }
  return result
}

export function numberFrom(value: string | undefined | null): number | null {
  if (value === undefined || value === null || value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function booleanFrom(value: string | undefined | null): boolean {
  return value?.trim().toLowerCase() === 'true'
}

export function pathId(absolutePath: string): string {
  return createHash('sha1').update(absolutePath.toLowerCase()).digest('hex').slice(0, 12)
}

export function epochToIso(value: number | null): string | null {
  if (value === null || !Number.isFinite(value) || value <= 0) return null

  const ms = value < 1e12 ? value * 1000 : value
  const date = new Date(ms)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}
