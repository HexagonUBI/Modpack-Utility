import { readdir, rename, stat, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import type {
  ContentResult,
  ResourcePackEntry,
  ResourcePackReport,
  ScreenshotEntry,
  ScreenshotReport
} from '@shared/types'
import { isDirectory, isFile, parseJsonLoose, readTextFile } from './fsutil'
import { measureDirectory } from './sizes'
import { withZip } from './zip'

const MAX_PACK_ICON_BYTES = 512 * 1024
const SCREENSHOT_EXTENSIONS = /\.(png|jpe?g|webp)$/i

export async function readResourcePacks(gameDir: string): Promise<ResourcePackReport> {
  const dir = join(gameDir, 'resourcepacks')

  if (!(await isDirectory(dir))) {
    return { dir, exists: false, packs: [], totalBytes: 0, enabledBytes: 0 }
  }

  const active = await readEnabledPacks(gameDir)
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  const packs: ResourcePackEntry[] = []

  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue

    if (entry.name.startsWith('.')) continue

    const path = join(dir, entry.name)
    const isDir = entry.isDirectory()
    if (!isDir && !entry.name.toLowerCase().endsWith('.zip')) continue

    if (isDir && !(await isFile(join(path, 'pack.mcmeta')))) continue

    const measured = await measureDirectory(path)
    const metadata = isDir ? await readFolderPack(path) : await readZipPack(path)
    const order = active.indexOf(entry.name.toLowerCase())

    packs.push({
      path,
      name: entry.name,
      isDirectory: isDir,
      sizeBytes: measured.sizeBytes,
      enabled: order >= 0,
      order: order >= 0 ? order : null,
      ...metadata
    })
  }

  packs.sort((a, b) => {
    if (a.enabled !== b.enabled) return a.enabled ? -1 : 1
    if (a.enabled && b.enabled) return (a.order ?? 0) - (b.order ?? 0)
    return b.sizeBytes - a.sizeBytes
  })

  return {
    dir,
    exists: true,
    packs,
    totalBytes: packs.reduce((sum, pack) => sum + pack.sizeBytes, 0),
    enabledBytes: packs.filter((pack) => pack.enabled).reduce((sum, pack) => sum + pack.sizeBytes, 0)
  }
}

async function readEnabledPacks(gameDir: string): Promise<string[]> {
  const options = await readTextFile(join(gameDir, 'options.txt'))
  if (options === null) return []

  const line = /^resourcePacks:(.*)$/m.exec(options)?.[1]
  if (!line) return []

  const names = [...line.matchAll(/"([^"]*)"/g)].map((match) => match[1] ?? '')
  return names
    .filter((name) => name.startsWith('file/'))
    .map((name) => name.slice('file/'.length).toLowerCase())
}

type PackMetadata = Pick<ResourcePackEntry, 'description' | 'packFormat' | 'iconDataUrl'>

const EMPTY_METADATA: PackMetadata = { description: null, packFormat: null, iconDataUrl: null }

async function readFolderPack(path: string): Promise<PackMetadata> {
  const raw = await readTextFile(join(path, 'pack.mcmeta'))
  const icon = await readIconFile(join(path, 'pack.png'))
  return { ...describePack(raw), iconDataUrl: icon }
}

async function readZipPack(path: string): Promise<PackMetadata> {
  try {
    return await withZip(path, async (zip) => {
      const raw = await zip.readText('pack.mcmeta')

      let icon: string | null = null
      const iconEntry = zip.find('pack.png')
      if (iconEntry && iconEntry.uncompressedSize <= MAX_PACK_ICON_BYTES) {
        const buffer = await zip.read(iconEntry).catch(() => null)
        if (buffer) icon = `data:image/png;base64,${buffer.toString('base64')}`
      }

      return { ...describePack(raw), iconDataUrl: icon }
    })
  } catch {
    return EMPTY_METADATA
  }
}

function describePack(raw: string | null): Pick<PackMetadata, 'description' | 'packFormat'> {
  if (raw === null) return { description: null, packFormat: null }

  const json = parseJsonLoose<Record<string, unknown>>(raw)
  const pack = json?.['pack']
  if (typeof pack !== 'object' || pack === null) return { description: null, packFormat: null }

  const record = pack as Record<string, unknown>
  const format = record['pack_format']

  return {
    description: flattenText(record['description']),
    packFormat: typeof format === 'number' ? format : null
  }
}

function flattenText(value: unknown): string | null {
  if (typeof value === 'string') return value.replace(/\u00a7./g, '').trim() || null

  if (Array.isArray(value)) {
    const joined = value.map(flattenText).filter(Boolean).join('')
    return joined || null
  }

  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>
    const own = flattenText(record['text']) ?? ''
    const extra = flattenText(record['extra']) ?? ''
    return `${own}${extra}` || null
  }

  return null
}

async function readIconFile(path: string): Promise<string | null> {
  try {
    const info = await stat(path)
    if (!info.isFile() || info.size === 0 || info.size > MAX_PACK_ICON_BYTES) return null
    const { readFile } = await import('node:fs/promises')
    return `data:image/png;base64,${(await readFile(path)).toString('base64')}`
  } catch {
    return null
  }
}

export async function setModEnabled(path: string, enabled: boolean): Promise<ContentResult> {
  const isDisabled = path.toLowerCase().endsWith('.disabled')
  if (enabled === !isDisabled) return { ok: true, path, error: null, detail: null }

  const target = enabled ? path.replace(/\.disabled$/i, '') : `${path}.disabled`

  if (await isFile(target)) {
    return { ok: false, path: null, error: 'modFileExists', detail: basename(target) }
  }

  await rename(path, target)
  return { ok: true, path: target, error: null, detail: null }
}

export async function setResourcePackEnabled(
  gameDir: string,
  packName: string,
  enabled: boolean
): Promise<ContentResult> {
  const optionsPath = join(gameDir, 'options.txt')
  const text = await readTextFile(optionsPath)
  if (text === null) {
    return { ok: false, path: null, error: 'noOptionsFile', detail: null }
  }

  const newline = text.includes('\r\n') ? '\r\n' : '\n'
  const lines = text.split(/\r?\n/)
  const index = lines.findIndex((line) => line.startsWith('resourcePacks:'))

  const current: string[] =
    index >= 0 ? (parseJsonLoose<string[]>(lines[index]!.slice('resourcePacks:'.length)) ?? []) : []

  const entry = `file/${packName}`
  const without = current.filter((value) => value !== entry)

  const next = enabled ? [...without, entry] : without

  const rendered = `resourcePacks:${JSON.stringify(next)}`
  if (index >= 0) lines[index] = rendered
  else lines.push(rendered)

  await writeFile(optionsPath, lines.join(newline), 'utf8')
  return { ok: true, path: optionsPath, error: null, detail: null }
}

export async function readScreenshots(gameDir: string): Promise<ScreenshotReport> {
  const dir = join(gameDir, 'screenshots')

  if (!(await isDirectory(dir))) {
    return { dir, exists: false, screenshots: [], totalBytes: 0 }
  }

  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  const screenshots: ScreenshotEntry[] = []

  for (const entry of entries) {
    if (!entry.isFile() || !SCREENSHOT_EXTENSIONS.test(entry.name)) continue

    const path = join(dir, entry.name)
    const info = await stat(path).catch(() => null)
    if (!info) continue

    screenshots.push({
      path,
      name: entry.name,
      sizeBytes: info.size,
      modifiedMs: info.mtimeMs
    })
  }

  screenshots.sort((a, b) => b.modifiedMs - a.modifiedMs)

  return {
    dir,
    exists: true,
    screenshots,
    totalBytes: screenshots.reduce((sum, shot) => sum + shot.sizeBytes, 0)
  }
}
