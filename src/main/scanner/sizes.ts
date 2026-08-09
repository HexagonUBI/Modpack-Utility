import { readdir, lstat } from 'node:fs/promises'
import { join } from 'node:path'
import type { SizeNode, StorageCategory, StorageReport } from '@shared/types'
import { isDirectory } from './fsutil'

const MAX_DEPTH = 8
const MAX_CHILDREN_PER_NODE = 150
const DIRECTORY_CONCURRENCY = 8
const PROGRESS_INTERVAL_MS = 90

const CATEGORY_BY_SEGMENT: Record<string, StorageCategory> = {
  mods: 'mods',
  config: 'config',
  defaultconfigs: 'config',
  saves: 'saves',
  resourcepacks: 'resourcepacks',
  texturepacks: 'resourcepacks',
  shaderpacks: 'shaderpacks',
  logs: 'logs',
  'crash-reports': 'crashes',
  backups: 'backups',
  cache: 'cache',
  '.cache': 'cache',
  downloads: 'cache',

  '.fabric': 'cache',
  '.mixin.out': 'cache',
  '.index': 'cache',
  '.tmp': 'cache',
  distant_horizons_server_data: 'lod',
  distanthorizons: 'lod',
  lodserverdata: 'lod',
  journeymap: 'maps',
  xaero: 'maps',
  xaerominimap: 'maps',
  xaeroworldmap: 'maps',
  voxelmap: 'maps',
  mamiyaotaru: 'maps',
  screenshots: 'screenshots',
  libraries: 'libraries',
  versions: 'versions',
  bin: 'libraries',
  natives: 'libraries'
}

export interface MeasureResult {
  sizeBytes: number
  fileCount: number
}

export interface StorageScanOptions {
  onProgress?: (filesScanned: number, relativePath: string) => void
}

export async function analyseStorage(root: string, options: StorageScanOptions = {}): Promise<StorageReport> {
  const startedAt = Date.now()
  const state: WalkState = {
    root,
    filesScanned: 0,
    truncated: false,
    lastReportedAt: 0,
    onProgress: options.onProgress
  }

  const node = await walk(root, displayName(root), 'other', 0, state)
  const byCategory = summariseByCategory(node)

  return {
    root: node,
    scannedFiles: state.filesScanned,
    scannedMs: Date.now() - startedAt,
    byCategory,
    truncated: state.truncated
  }
}

export async function measureDirectory(path: string): Promise<MeasureResult> {
  const info = await lstat(path).catch(() => null)
  if (!info) return { sizeBytes: 0, fileCount: 0 }
  if (info.isFile()) return { sizeBytes: info.size, fileCount: 1 }
  if (!info.isDirectory()) return { sizeBytes: 0, fileCount: 0 }

  let sizeBytes = 0
  let fileCount = 0

  const entries = await readdir(path, { withFileTypes: true }).catch(() => [])
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue

    if (entry.isFile()) {
      const stats = await lstat(join(path, entry.name)).catch(() => null)
      if (stats) {
        sizeBytes += stats.size
        fileCount++
      }
      continue
    }
    if (entry.isDirectory()) {
      const nested = await measureDirectory(join(path, entry.name))
      sizeBytes += nested.sizeBytes
      fileCount += nested.fileCount
    }
  }

  return { sizeBytes, fileCount }
}

interface WalkState {
  root: string
  filesScanned: number
  truncated: boolean
  lastReportedAt: number
  onProgress?: (filesScanned: number, relativePath: string) => void
}

async function walk(
  path: string,
  name: string,
  category: StorageCategory,
  depth: number,
  state: WalkState
): Promise<SizeNode> {
  const node: SizeNode = {
    name,
    path,
    sizeBytes: 0,
    fileCount: 0,
    isDirectory: true,
    category,
    aggregatedCount: null,
    children: []
  }

  const entries = await readdir(path, { withFileTypes: true }).catch(() => [])
  const children: SizeNode[] = []

  const files = entries.filter((entry) => entry.isFile() && !entry.isSymbolicLink())
  const directories = entries.filter((entry) => entry.isDirectory() && !entry.isSymbolicLink())

  const fileStats = await Promise.all(
    files.map(async (entry) => {
      const full = join(path, entry.name)
      const stats = await lstat(full).catch(() => null)
      return stats ? { name: entry.name, path: full, size: stats.size } : null
    })
  )

  for (const file of fileStats) {
    if (!file) continue
    node.sizeBytes += file.size
    node.fileCount++
    state.filesScanned++
    children.push({
      name: file.name,
      path: file.path,
      sizeBytes: file.size,
      fileCount: 1,
      isDirectory: false,
      category,
      aggregatedCount: null,
      children: null
    })
  }

  reportProgress(state, path)

  const subtrees = await mapWithConcurrency(directories, DIRECTORY_CONCURRENCY, async (entry) => {
    const childPath = join(path, entry.name)
    const childCategory = depth === 0 ? categoryForSegment(entry.name) : category

    if (depth + 1 >= MAX_DEPTH) {
      state.truncated = true
      const measured = await measureDirectory(childPath)
      state.filesScanned += measured.fileCount
      return {
        name: entry.name,
        path: childPath,
        sizeBytes: measured.sizeBytes,
        fileCount: measured.fileCount,
        isDirectory: true,
        category: childCategory,
        aggregatedCount: null,
        children: null
      } satisfies SizeNode
    }

    return walk(childPath, entry.name, childCategory, depth + 1, state)
  })

  for (const subtree of subtrees) {
    node.sizeBytes += subtree.sizeBytes
    node.fileCount += subtree.fileCount
    children.push(subtree)
  }

  node.children = pruneChildren(children, state)
  return node
}

function pruneChildren(children: SizeNode[], state: WalkState): SizeNode[] {
  children.sort((a, b) => b.sizeBytes - a.sizeBytes)
  if (children.length <= MAX_CHILDREN_PER_NODE) return children

  state.truncated = true
  const kept = children.slice(0, MAX_CHILDREN_PER_NODE)
  const rest = children.slice(MAX_CHILDREN_PER_NODE)

  const remainder: SizeNode = {
    name: '',
    path: '',
    sizeBytes: rest.reduce((sum, child) => sum + child.sizeBytes, 0),
    fileCount: rest.reduce((sum, child) => sum + child.fileCount, 0),
    isDirectory: true,
    category: kept[0]?.category ?? 'other',
    aggregatedCount: rest.length,
    children: rest
  }

  kept.push(remainder)
  return kept
}

function summariseByCategory(root: SizeNode): StorageReport['byCategory'] {
  const totals = new Map<StorageCategory, { sizeBytes: number; fileCount: number }>()

  for (const child of root.children ?? []) {
    const bucket = totals.get(child.category) ?? { sizeBytes: 0, fileCount: 0 }
    bucket.sizeBytes += child.sizeBytes
    bucket.fileCount += child.fileCount
    totals.set(child.category, bucket)
  }

  return [...totals.entries()]
    .map(([category, value]) => ({ category, ...value }))
    .sort((a, b) => b.sizeBytes - a.sizeBytes)
}

export async function listDirectoryWithSizes(path: string): Promise<SizeNode[]> {
  const entries = await readdir(path, { withFileTypes: true }).catch(() => [])
  const nodes: SizeNode[] = []

  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue
    const childPath = join(path, entry.name)

    if (entry.isFile()) {
      const stats = await lstat(childPath).catch(() => null)
      if (!stats) continue
      nodes.push({
        name: entry.name,
        path: childPath,
        sizeBytes: stats.size,
        fileCount: 1,
        isDirectory: false,
        category: 'other',
        aggregatedCount: null,
        children: null
      })
      continue
    }

    if (!entry.isDirectory()) continue

    const measured = await measureDirectory(childPath)
    nodes.push({
      name: entry.name,
      path: childPath,
      sizeBytes: measured.sizeBytes,
      fileCount: measured.fileCount,
      isDirectory: true,
      category: 'other',
      aggregatedCount: null,
      children: null
    })
  }

  return nodes.sort((a, b) => b.sizeBytes - a.sizeBytes)
}

export function categoryForSegment(segment: string): StorageCategory {
  return CATEGORY_BY_SEGMENT[segment.toLowerCase()] ?? 'other'
}

export async function directoryExists(path: string): Promise<boolean> {
  return isDirectory(path)
}

function reportProgress(state: WalkState, path: string): void {
  if (!state.onProgress) return

  const now = Date.now()
  if (now - state.lastReportedAt < PROGRESS_INTERVAL_MS) return
  state.lastReportedAt = now

  state.onProgress(state.filesScanned, relativeTo(state.root, path))
}

function relativeTo(root: string, path: string): string {
  if (!path.toLowerCase().startsWith(root.toLowerCase())) return displayName(path)
  const relative = path.slice(root.length).replace(/^[\\/]+/, '')
  return relative.length > 0 ? relative.replace(/\\/g, '/') : '.'
}

function displayName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let cursor = 0

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = cursor++
      if (index >= items.length) return
      results[index] = await fn(items[index]!)
    }
  })

  await Promise.all(workers)
  return results
}
