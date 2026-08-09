import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import type {
  ConfigEntry,
  ConfigMatchReason,
  ConfigReport,
  ConfigStatus,
  ModFile
} from '@shared/types'
import { isDirectory, isFile } from './fsutil'
import { measureDirectory } from './sizes'

const CONFIG_EXTENSIONS = [
  '.toml',
  '.json',
  '.json5',
  '.jsonc',
  '.cfg',
  '.conf',
  '.config',
  '.properties',
  '.yaml',
  '.yml',
  '.txt',
  '.snbt',
  '.ini',
  '.xml',
  '.hocon',
  '.nbt',
  '.dat',
  '.bak',
  '.old',
  '.disabled'
]

const SIDE_SUFFIXES = [
  '-client',
  '-server',
  '-common',
  '-config',
  '-options',
  '-settings',
  '-general',
  '_client',
  '_server',
  '_common',
  '_config',
  '.client',
  '.server',
  '.common'
]

const SYSTEM_ENTRIES = new Set([
  'fml.toml',
  'forge-client.toml',
  'forge-common.toml',
  'forge-server.toml',
  'neoforge-client.toml',
  'neoforge-common.toml',
  'neoforge-server.toml',
  'fabric_loader_dependencies.json',
  'fabric',
  'quilt',
  'jvm_args.txt',
  'splash.properties',
  'memory_settings.json',
  'defaultconfigs',
  '.ds_store',
  'desktop.ini',
  'thumbs.db'
])

interface IndexedMod {
  modId: string
  name: string
  enabled: boolean

  slug: string | null
}

const MIN_SPECULATIVE_COVERAGE = 0.65

interface MatchResult {
  mod: IndexedMod
  confidence: number
  reason: ConfigMatchReason
}

export async function readConfigs(
  configDir: string,
  mods: ModFile[],
  gameDir?: string
): Promise<ConfigReport> {
  const optionsPath = gameDir ? join(gameDir, 'options.txt') : null
  const gameOptionsPath = optionsPath && (await isFile(optionsPath)) ? optionsPath : null

  const empty: ConfigReport = {
    configDir,
    exists: false,
    gameOptionsPath,
    entries: [],
    modsWithoutConfig: [],
    totals: { owned: 0, inactive: 0, orphaned: 0, system: 0, unmatched: 0 },
    reclaimableBytes: 0
  }

  if (!(await isDirectory(configDir))) return empty

  const index = buildModIndex(mods)
  const dirEntries = await readdir(configDir, { withFileTypes: true }).catch(() => [])

  const entries: ConfigEntry[] = []
  const matchedModIds = new Set<string>()

  for (const dirEntry of dirEntries) {
    if (dirEntry.isSymbolicLink()) continue

    const path = join(configDir, dirEntry.name)
    const isDir = dirEntry.isDirectory()
    const measured = await measureDirectory(path)

    const classification = classify(dirEntry.name, isDir, index)
    if (classification.ownerModId) matchedModIds.add(classification.ownerModId.toLowerCase())

    entries.push({
      path,
      relativePath: dirEntry.name,
      isDirectory: isDir,
      sizeBytes: measured.sizeBytes,
      fileCount: isDir ? measured.fileCount : 1,
      modifiedMs: 0,
      ...classification
    })
  }

  entries.sort((a, b) => b.sizeBytes - a.sizeBytes)

  const totals: Record<ConfigStatus, number> = {
    owned: 0,
    inactive: 0,
    orphaned: 0,
    system: 0,
    unmatched: 0
  }
  for (const entry of entries) totals[entry.status]++

  return {
    configDir,
    exists: true,
    gameOptionsPath,
    entries,
    totals,
    modsWithoutConfig: mods
      .filter((mod) => mod.enabled && mod.modId && !matchedModIds.has(mod.modId.toLowerCase()))
      .map((mod) => ({ modId: mod.modId!, name: mod.name ?? mod.modId! }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    reclaimableBytes: entries
      .filter((entry) => entry.status === 'orphaned')
      .reduce((sum, entry) => sum + entry.sizeBytes, 0)
  }
}

type Classification = Pick<ConfigEntry, 'status' | 'ownerModId' | 'ownerModName' | 'confidence' | 'reason'>

function classify(entryName: string, isDirectoryEntry: boolean, index: ModIndex): Classification {
  const lower = entryName.toLowerCase()
  const base = isDirectoryEntry ? lower : stripConfigExtensions(lower)

  if (SYSTEM_ENTRIES.has(lower) || SYSTEM_ENTRIES.has(base)) {
    return {
      status: 'system',
      ownerModId: null,
      ownerModName: null,
      confidence: 1,
      reason: { kind: 'system' }
    }
  }

  const match = findBestMatch(base, index)
  if (match) {
    return {
      status: match.mod.enabled ? 'owned' : 'inactive',
      ownerModId: match.mod.modId,
      ownerModName: match.mod.name,
      confidence: match.confidence,
      reason: match.reason
    }
  }

  if (index.size === 0) {
    return {
      status: 'unmatched',
      ownerModId: null,
      ownerModName: null,
      confidence: 0,
      reason: { kind: 'noMods' }
    }
  }

  return {
    status: 'orphaned',
    ownerModId: null,
    ownerModName: null,
    confidence: 0,
    reason: { kind: 'noMatch' }
  }
}

interface ModIndex {
  size: number
  byExactId: Map<string, IndexedMod>
  byNormalisedId: Map<string, IndexedMod>
  byNormalisedName: Map<string, IndexedMod>
  byFileBase: Map<string, IndexedMod>

  byBundledConfig: Map<string, IndexedMod>

  bySlug: Map<string, IndexedMod>

  byAcronym: Map<string, IndexedMod>
  all: IndexedMod[]
}

function buildModIndex(mods: ModFile[]): ModIndex {
  const index: ModIndex = {
    size: 0,
    byExactId: new Map(),
    byNormalisedId: new Map(),
    byNormalisedName: new Map(),
    byFileBase: new Map(),
    byBundledConfig: new Map(),
    bySlug: new Map(),
    byAcronym: new Map(),
    all: []
  }

  for (const mod of mods) {
    const modId = mod.modId ?? deriveIdFromFileName(mod.fileName)
    if (!modId) continue

    const indexed: IndexedMod = {
      modId,
      name: mod.name ?? modId,
      enabled: mod.enabled,
      slug: mod.slug
    }
    index.all.push(indexed)

    addTo(index.byExactId, modId.toLowerCase(), indexed)
    addTo(index.byNormalisedId, normalise(modId), indexed)
    for (const provided of mod.provides) {
      addTo(index.byExactId, provided.toLowerCase(), indexed)
      addTo(index.byNormalisedId, normalise(provided), indexed)
    }
    if (mod.name) addTo(index.byNormalisedName, normalise(mod.name), indexed)
    addTo(index.byFileBase, normalise(stripJarVersion(mod.fileName)), indexed)

    for (const bundled of mod.bundledConfigNames) {
      addTo(index.byBundledConfig, normalise(bundled), indexed)
    }
    if (mod.slug) addTo(index.bySlug, normalise(mod.slug), indexed)
    for (const source of [modId, mod.name]) {
      const initials = source ? acronym(source) : null
      if (initials) addTo(index.byAcronym, initials, indexed)
    }
  }

  index.size = index.all.length
  return index
}

function addTo(map: Map<string, IndexedMod>, key: string, mod: IndexedMod): void {
  if (key.length === 0) return
  const existing = map.get(key)
  if (!existing || (!existing.enabled && mod.enabled)) map.set(key, mod)
}

function findBestMatch(base: string, index: ModIndex): MatchResult | null {
  const normalisedBase = normalise(base)

  for (const { key: candidate, speculative } of candidateKeys(base)) {
    const normalised = normalise(candidate)
    if (normalised.length === 0) continue

    const coverage = normalisedBase.length > 0 ? Math.min(1, normalised.length / normalisedBase.length) : 1
    if (speculative && coverage < MIN_SPECULATIVE_COVERAGE) continue

    const scale = 0.75 + 0.25 * coverage

    const exact = index.byExactId.get(candidate)
    if (exact) {
      return {
        mod: exact,
        confidence: scale,
        reason:
          coverage === 1
            ? { kind: 'exactModId', modId: exact.modId }
            : { kind: 'namedAfterModId', modId: exact.modId }
      }
    }

    const byId = index.byNormalisedId.get(normalised)
    if (byId) {
      return {
        mod: byId,
        confidence: 0.92 * scale,
        reason: { kind: 'normalisedModId', modId: byId.modId }
      }
    }

    const byBundled = index.byBundledConfig.get(normalised)
    if (byBundled) {
      return {
        mod: byBundled,
        confidence: 0.85 * scale,
        reason: { kind: 'bundledConfig', modName: byBundled.name }
      }
    }

    const bySlug = index.bySlug.get(normalised)
    if (bySlug && bySlug.slug) {
      return {
        mod: bySlug,
        confidence: 0.88 * scale,
        reason: { kind: 'slug', slug: bySlug.slug }
      }
    }

    const byName = index.byNormalisedName.get(normalised)
    if (byName) {
      return {
        mod: byName,
        confidence: 0.82 * scale,
        reason: { kind: 'modName', modName: byName.name }
      }
    }

    const byFile = index.byFileBase.get(normalised)
    if (byFile) {
      return {
        mod: byFile,
        confidence: 0.7 * scale,
        reason: { kind: 'fileName', modName: byFile.name }
      }
    }

    const byInitials = index.byAcronym.get(normalised)
    if (byInitials) {
      return {
        mod: byInitials,
        confidence: 0.6 * scale,
        reason: { kind: 'initials', candidate, modName: byInitials.name }
      }
    }
  }

  return findPartialMatch(base, index)
}

function findPartialMatch(base: string, index: ModIndex): MatchResult | null {
  const normalisedBase = normalise(base)
  if (normalisedBase.length < 4) return null

  let best: MatchResult | null = null

  for (const mod of index.all) {
    const normalisedId = normalise(mod.modId)
    if (normalisedId.length < 4) continue

    if (normalisedBase.startsWith(normalisedId) || normalisedBase.endsWith(normalisedId)) {
      const coverage = normalisedId.length / normalisedBase.length
      if (coverage < 0.5) continue

      const confidence = 0.4 + coverage * 0.2
      if (!best || confidence > best.confidence) {
        best = { mod, confidence, reason: { kind: 'containsModId', modId: mod.modId } }
      }
      continue
    }

    if (normalisedId.startsWith(normalisedBase)) {
      const coverage = normalisedBase.length / normalisedId.length
      if (coverage < 0.35) continue

      const confidence = 0.3 + coverage * 0.2
      if (!best || confidence > best.confidence) {
        best = { mod, confidence, reason: { kind: 'shortenedModId', modId: mod.modId } }
      }
    }
  }

  return best
}

interface Candidate {
  key: string

  speculative: boolean
}

function candidateKeys(base: string): Candidate[] {
  const keys: Candidate[] = []
  const add = (key: string, speculative: boolean): void => {
    if (key.length > 0 && !keys.some((entry) => entry.key === key)) keys.push({ key, speculative })
  }

  add(base, false)

  let reduced = base

  for (let pass = 0; pass < 3; pass++) {
    const suffix = SIDE_SUFFIXES.find((candidate) => reduced.endsWith(candidate))
    if (!suffix) break
    reduced = reduced.slice(0, -suffix.length)
    add(reduced, false)
  }

  let trimmed = reduced
  for (let pass = 0; pass < 4; pass++) {
    const cut = Math.max(trimmed.lastIndexOf('.'), trimmed.lastIndexOf('-'), trimmed.lastIndexOf('_'))
    if (cut <= 0) break
    trimmed = trimmed.slice(0, cut)
    add(trimmed, true)
  }

  return keys
}

function stripConfigExtensions(name: string): string {
  let result = name

  for (let pass = 0; pass < 2; pass++) {
    const extension = CONFIG_EXTENSIONS.find((candidate) => result.endsWith(candidate))
    if (!extension) break
    result = result.slice(0, -extension.length)
  }
  return result
}

function stripJarVersion(fileName: string): string {
  return fileName
    .replace(/\.jar(\.disabled|\.bak)?$/i, '')
    .replace(/[-_+](mc)?\d[\w.+]*$/i, '')
}

function deriveIdFromFileName(fileName: string): string | null {
  const base = stripJarVersion(fileName).trim()
  return base.length > 0 ? base : null
}

function normalise(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function acronym(value: string): string | null {
  const words = value
    .split(/[^a-zA-Z0-9]+|(?<=[a-z])(?=[A-Z])/)
    .filter(Boolean)
    .filter((word) => !/^v?\d+$/i.test(word))

  if (words.length < 2) return null

  const initials = words.map((word) => word[0]!.toLowerCase()).join('')
  return initials.length >= 3 ? initials : null
}
