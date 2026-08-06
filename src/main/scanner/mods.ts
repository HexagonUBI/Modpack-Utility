import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type {
  DependencyKind,
  MissingDependency,
  ModConflict,
  ModDependency,
  ModFile,
  ModLoaderType,
  ModsReport
} from '@shared/types'
import { IMPLICIT_MOD_IDS } from '@shared/modIds'
import { withZip, ZipReader } from './zip'
import { satisfies } from './versions'
import { isDirectory, parseJsonLoose } from './fsutil'
import { isTable, parseToml, tomlBoolean, tomlString, tomlTableArray, type TomlTable } from './toml'

const JAR_CONCURRENCY = 16

export type PhysicalSide = 'client' | 'server'

export async function readMods(modsDir: string, physicalSide: PhysicalSide = 'client'): Promise<ModsReport> {
  if (!(await isDirectory(modsDir))) {
    return {
      modsDir,
      exists: false,
      mods: [],
      missingDependencies: [],
      conflicts: [],
      totalBytes: 0,
      disabledBytes: 0
    }
  }

  const files = await collectJarPaths(modsDir)
  const mods = await mapWithConcurrency(files, JAR_CONCURRENCY, readModFile)

  mods.sort((a, b) => (a.name ?? a.fileName).localeCompare(b.name ?? b.fileName))
  const provided = indexProvidedIds(mods)

  const missingDependencies = findMissingDependencies(mods, provided, physicalSide)
  const conflicts = findConflicts(mods, provided.byId)
  annotateProblems(mods, provided, physicalSide, conflicts)

  return {
    modsDir,
    exists: true,
    mods,
    missingDependencies,
    conflicts,
    totalBytes: mods.reduce((sum, mod) => sum + mod.sizeBytes, 0),
    disabledBytes: mods.filter((mod) => !mod.enabled).reduce((sum, mod) => sum + mod.sizeBytes, 0)
  }
}

async function collectJarPaths(modsDir: string): Promise<string[]> {
  const paths: string[] = []

  const entries = await readdir(modsDir, { withFileTypes: true }).catch(() => [])
  for (const entry of entries) {
    const full = join(modsDir, entry.name)
    if (entry.isFile() && isModArchive(entry.name)) {
      paths.push(full)
      continue
    }
    if (!entry.isDirectory()) continue

    const nested = await readdir(full, { withFileTypes: true }).catch(() => [])
    for (const child of nested) {
      if (child.isFile() && isModArchive(child.name)) paths.push(join(full, child.name))
    }
  }

  return paths
}

function isModArchive(fileName: string): boolean {
  const lower = fileName.toLowerCase()
  return lower.endsWith('.jar') || lower.endsWith('.jar.disabled') || lower.endsWith('.jar.bak')
}

async function readModFile(filePath: string): Promise<ModFile> {
  const fileName = filePath.split(/[\\/]/).pop() ?? filePath
  const lower = fileName.toLowerCase()
  const enabled = lower.endsWith('.jar')

  let sizeBytes = 0
  let modifiedMs = 0
  try {
    const info = await stat(filePath)
    sizeBytes = info.size
    modifiedMs = info.mtimeMs
  } catch {
  }

  const base: ModFile = {
    filePath,
    fileName,
    sizeBytes,
    enabled,
    modifiedMs,
    modId: null,
    name: null,
    version: null,
    description: null,
    authors: [],
    homepage: null,
    loaderType: 'unknown',
    dependencies: [],
    provides: [],
    providedVersions: {},
    resourceNamespaces: [],
    bundledConfigNames: [],
    environment: null,
    iconDataUrl: null,
    problems: { missing: [], disabledDependencies: [], conflictsWith: [] },
    parseError: null
  }

  try {
    const parsed = await withZip(filePath, async (zip): Promise<ParsedManifest> => {
      const hints = readResourceHints(zip)
      const nested = await readNestedManifests(zip)
      const nestedIds = nested.flatMap((entry) => [entry.modId, ...(entry.provides ?? [])])
      const provided = nestedIds.filter((id): id is string => Boolean(id))

      const providedVersions: Record<string, string> = {}
      for (const entry of nested) {
        if (entry.modId && entry.version) providedVersions[entry.modId.toLowerCase()] = entry.version
      }

      const manifest = await parseJarIdentity(zip)
      if (manifest) {
        return {
          ...manifest,
          ...hints,
          provides: [...(manifest.provides ?? []), ...provided],
          providedVersions
        }
      }

      const primary = nested.find((entry) => entry.modId)
      if (primary) {
        return {
          ...primary,
          ...hints,
          provides: provided.filter((id) => id !== primary.modId)
        }
      }

      return hints
    })

    if (parsed.modId || parsed.name) return { ...base, ...parsed }
    return {
      ...base,
      ...parsed,
      name: prettyNameFromFileName(fileName),
      parseError: 'No mod manifest found'
    }
  } catch (error) {
    return {
      ...base,
      name: prettyNameFromFileName(fileName),
      parseError: error instanceof Error ? error.message : String(error)
    }
  }
}

interface ParsedManifest extends Partial<ModFile> {
  iconPath?: string | null
}

const MOD_ICON_EXTENSION = /\.(png|jpe?g)$/i
const MAX_MOD_ICON_BYTES = 384 * 1024

async function parseJarIdentity(zip: ZipReader): Promise<ParsedManifest | null> {
  const manifest = await readManifest(zip)
  if (!manifest) return null

  const { iconPath, ...rest } = manifest
  return { ...rest, iconDataUrl: await readModIcon(zip, iconPath ?? null, rest.modId ?? null) }
}

async function readModIcon(
  zip: ZipReader,
  declaredPath: string | null,
  modId: string | null
): Promise<string | null> {
  const candidates = [
    declaredPath,
    modId ? `assets/${modId}/icon.png` : null,
    modId ? `assets/${modId}/logo.png` : null,
    modId ? `assets/${modId}/textures/icon.png` : null,
    'icon.png',
    'logo.png',
    'pack.png'
  ].filter((path): path is string => Boolean(path))

  for (const candidate of candidates) {
    const entry = zip.find(candidate.replace(/^\/+/, ''))
    if (!entry || entry.isDirectory) continue
    if (!MOD_ICON_EXTENSION.test(entry.fileName)) continue
    if (entry.uncompressedSize === 0 || entry.uncompressedSize > MAX_MOD_ICON_BYTES) continue

    try {
      const buffer = await zip.read(entry)
      const mime = /\.jpe?g$/i.test(entry.fileName) ? 'image/jpeg' : 'image/png'
      return `data:${mime};base64,${buffer.toString('base64')}`
    } catch {
    }
  }

  return null
}

const NESTED_JAR_PATTERN = /^META-INF\/(jars|jarjar)\/.+\.jar$/i
const MAX_NESTED_JARS = 96

const MAX_NESTED_JAR_BYTES = 48 * 1024 * 1024

async function readNestedManifests(zip: ZipReader): Promise<ParsedManifest[]> {
  const nestedEntries = zip
    .entries()
    .filter(
      (entry) =>
        !entry.isDirectory &&
        NESTED_JAR_PATTERN.test(entry.fileName) &&
        entry.uncompressedSize <= MAX_NESTED_JAR_BYTES
    )
    .slice(0, MAX_NESTED_JARS)

  const manifests: ParsedManifest[] = []

  for (const entry of nestedEntries) {
    try {
      const nested = await ZipReader.fromBuffer(await zip.read(entry))
      try {
        const manifest = await parseJarIdentity(nested)
        if (manifest) manifests.push(manifest)
      } finally {
        await nested.close()
      }
    } catch {
    }
  }

  return manifests
}

const MAX_NAMESPACES = 24
const CONFIG_LIKE_EXTENSION = /\.(toml|json5?|cfg|conf|properties|yaml|yml|snbt)$/i

function readResourceHints(zip: ZipReader): Pick<ModFile, 'resourceNamespaces' | 'bundledConfigNames'> {
  const namespaces = new Set<string>()
  const configNames = new Set<string>()

  for (const entry of zip.entries()) {
    const parts = entry.fileName.split('/')

    if ((parts[0] === 'assets' || parts[0] === 'data') && parts.length > 2) {
      const namespace = parts[1]

      if (namespace && namespace !== 'minecraft' && namespaces.size < MAX_NAMESPACES) {
        namespaces.add(namespace)
      }
      continue
    }

    if (entry.isDirectory) continue

    const isRootFile = parts.length === 1
    const isConfigFolderFile = parts.length === 2 && parts[0]?.toLowerCase() === 'config'
    if ((isRootFile || isConfigFolderFile) && CONFIG_LIKE_EXTENSION.test(entry.fileName)) {
      const base = parts[parts.length - 1]!.replace(CONFIG_LIKE_EXTENSION, '')
      if (base.length > 2) configNames.add(base)
    }
  }

  return { resourceNamespaces: [...namespaces], bundledConfigNames: [...configNames] }
}

async function readManifest(zip: ZipReader): Promise<ParsedManifest | null> {
  const fabric = await zip.readText('fabric.mod.json')
  if (fabric) return parseFabricManifest(fabric)

  const quilt = await zip.readText('quilt.mod.json')
  if (quilt) return parseQuiltManifest(quilt)

  const neoforge = await zip.readText('META-INF/neoforge.mods.toml')
  if (neoforge) return parseForgeManifest(neoforge, 'neoforge', zip)

  const forge = await zip.readText('META-INF/mods.toml')
  if (forge) return parseForgeManifest(forge, 'forge', zip)

  const legacy = await zip.readText('mcmod.info')
  if (legacy) return parseLegacyManifest(legacy)

  return null
}

function parseFabricManifest(text: string): ParsedManifest | null {
  const json = parseJsonLoose<Record<string, unknown>>(text)
  if (!json) return null

  const environment = json['environment']
  return {
    loaderType: 'fabric',
    modId: asString(json['id']),
    name: asString(json['name']) ?? asString(json['id']),
    version: asString(json['version']),
    description: asString(json['description']),
    authors: readAuthorList(json['authors']),
    homepage: asString(valueAt(json, 'contact.homepage')) ?? asString(valueAt(json, 'contact.sources')),
    dependencies: [
      ...readFabricDependencies(json['depends'], 'required'),
      ...readFabricDependencies(json['recommends'], 'optional'),
      ...readFabricDependencies(json['breaks'], 'incompatible'),
      ...readFabricDependencies(json['conflicts'], 'incompatible')
    ],
    provides: asStringArray(json['provides']),
    iconPath: readFabricIconPath(json['icon']),
    environment:
      environment === 'client' ? 'client' : environment === 'server' ? 'server' : 'both'
  }
}

function readFabricIconPath(raw: unknown): string | null {
  if (typeof raw === 'string') return raw.trim() || null
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null

  const entries = Object.entries(raw as Record<string, unknown>)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    .sort((a, b) => (Number.parseInt(b[0], 10) || 0) - (Number.parseInt(a[0], 10) || 0))

  return entries[0]?.[1] ?? null
}

function readFabricDependencies(raw: unknown, kind: DependencyKind): ModDependency[] {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return []

  return Object.entries(raw as Record<string, unknown>).map(([modId, range]) => ({
    modId,
    versionRange: Array.isArray(range) ? range.map(String).join(' || ') : asString(range),
    kind,
    side: null
  }))
}

function parseQuiltManifest(text: string): ParsedManifest | null {
  const json = parseJsonLoose<Record<string, unknown>>(text)
  if (!json) return null

  const loader = valueAt(json, 'quilt_loader')
  const metadata = valueAt(json, 'quilt_loader.metadata')

  return {
    loaderType: 'quilt',
    modId: asString(valueAt(loader, 'id')),
    name: asString(valueAt(metadata, 'name')) ?? asString(valueAt(loader, 'id')),
    version: asString(valueAt(loader, 'version')),
    description: asString(valueAt(metadata, 'description')),
    authors: readQuiltContributors(valueAt(metadata, 'contributors')),
    homepage: asString(valueAt(metadata, 'contact.homepage')),
    dependencies: readQuiltDependencies(valueAt(loader, 'depends')),
    provides: readQuiltProvides(valueAt(loader, 'provides')),
    iconPath: readFabricIconPath(valueAt(metadata, 'icon')),
    environment: null
  }
}

function readQuiltContributors(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((entry) => String(entry))
  if (typeof raw === 'object' && raw !== null) return Object.keys(raw as Record<string, unknown>)
  return []
}

function readQuiltDependencies(raw: unknown): ModDependency[] {
  if (!Array.isArray(raw)) return []

  return raw
    .map((entry): ModDependency | null => {
      if (typeof entry === 'string') {
        return { modId: entry, versionRange: null, kind: 'required', side: null }
      }
      if (typeof entry !== 'object' || entry === null) return null
      const record = entry as Record<string, unknown>
      const modId = asString(record['id'])
      if (!modId) return null
      return {
        modId,
        versionRange: asString(record['versions']),
        kind: record['optional'] === true ? 'optional' : 'required',
        side: null
      }
    })
    .filter((entry): entry is ModDependency => entry !== null)
}

function readQuiltProvides(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((entry) =>
      typeof entry === 'string' ? entry : asString((entry as Record<string, unknown>)?.['id'])
    )
    .filter((entry): entry is string => Boolean(entry))
}

async function parseForgeManifest(
  text: string,
  loaderType: ModLoaderType,
  zip: ZipReader
): Promise<ParsedManifest | null> {
  const toml = parseToml(text)
  const mods = tomlTableArray(toml, 'mods')
  const primary = mods[0]
  if (!primary) return null

  const modId = tomlString(primary, 'modId')
  const declaredLoader = tomlString(toml, 'loaderVersion') ?? ''
  const resolvedType: ModLoaderType =
    loaderType === 'forge' && declaredLoader.toLowerCase().includes('neoforge') ? 'neoforge' : loaderType

  return {
    loaderType: resolvedType,
    modId,
    name: tomlString(primary, 'displayName') ?? modId,
    version: await resolveForgeVersion(tomlString(primary, 'version'), zip),
    description: tomlString(primary, 'description'),
    authors: splitAuthors(tomlString(primary, 'authors') ?? tomlString(toml, 'authors')),
    homepage: tomlString(primary, 'displayURL') ?? tomlString(toml, 'issueTrackerURL'),
    dependencies: modId ? readForgeDependencies(toml, modId) : [],

    provides: mods
      .slice(1)
      .map((entry) => tomlString(entry, 'modId'))
      .filter((entry): entry is string => Boolean(entry)),
    iconPath: tomlString(primary, 'logoFile') ?? tomlString(toml, 'logoFile'),
    environment: null
  }
}

async function resolveForgeVersion(declared: string | null, zip: ZipReader): Promise<string | null> {
  if (!declared) return null
  if (!declared.includes('${')) return declared

  const manifest = await zip.readText('META-INF/MANIFEST.MF')
  const resolved = manifest ? readManifestAttribute(manifest, 'Implementation-Version') : null
  return resolved ?? null
}

function readManifestAttribute(manifest: string, attribute: string): string | null {
  const unwrapped = manifest.replace(/\r?\n /g, '')
  const match = new RegExp(`^${attribute}:\\s*(.+)$`, 'im').exec(unwrapped)
  return match?.[1]?.trim() || null
}

function readForgeDependencies(toml: TomlTable, modId: string): ModDependency[] {
  const dependencies = toml['dependencies']
  if (!isTable(dependencies)) return []

  const forThisMod =
    tomlTableArray(dependencies, modId).length > 0
      ? tomlTableArray(dependencies, modId)
      : tomlTableArray(
          dependencies,
          Object.keys(dependencies).find((key) => key.toLowerCase() === modId.toLowerCase()) ?? modId
        )

  return forThisMod
    .map((entry): ModDependency | null => {
      const id = tomlString(entry, 'modId')
      if (!id) return null
      return {
        modId: id,
        versionRange: tomlString(entry, 'versionRange'),
        kind: readForgeDependencyKind(entry),
        side: readForgeSide(entry)
      }
    })
    .filter((entry): entry is ModDependency => entry !== null)
}

function readForgeDependencyKind(entry: TomlTable): DependencyKind {
  const type = tomlString(entry, 'type')?.toLowerCase()
  if (type === 'optional' || type === 'discouraged') return 'optional'
  if (type === 'incompatible') return 'incompatible'
  if (type === 'required') return 'required'

  const mandatory = tomlBoolean(entry, 'mandatory')
  if (mandatory === false) return 'optional'
  return 'required'
}

function readForgeSide(entry: TomlTable): ModDependency['side'] {
  switch (tomlString(entry, 'side')?.toUpperCase()) {
    case 'CLIENT':
      return 'client'
    case 'SERVER':
      return 'server'
    case 'BOTH':
      return 'both'
    default:
      return null
  }
}

function parseLegacyManifest(text: string): ParsedManifest | null {
  const json = parseJsonLoose<unknown>(text)
  const list = Array.isArray(json)
    ? json
    : Array.isArray((json as Record<string, unknown>)?.['modList'])
      ? ((json as Record<string, unknown>)['modList'] as unknown[])
      : []

  const first = list[0]
  if (typeof first !== 'object' || first === null) return null
  const entry = first as Record<string, unknown>

  return {
    loaderType: 'legacy-forge',
    modId: asString(entry['modid']),
    name: asString(entry['name']) ?? asString(entry['modid']),
    version: asString(entry['version']),
    description: asString(entry['description']),
    authors: asStringArray(entry['authorList']).concat(asStringArray(entry['authors'])),
    homepage: asString(entry['url']),
    dependencies: asStringArray(entry['dependencies']).map((modId): ModDependency => ({
      modId,
      versionRange: null,
      kind: 'required',
      side: null
    })),
    provides: [],
    iconPath: asString(entry['logoFile']),
    environment: null
  }
}

interface ProvidedIds {
  enabled: Set<string>
  disabled: Set<string>

  byId: Map<string, ModFile>
}

function indexProvidedIds(mods: ModFile[]): ProvidedIds {
  const enabled = new Set<string>()
  const disabled = new Set<string>()
  const byId = new Map<string, ModFile>()

  for (const mod of mods) {
    const target = mod.enabled ? enabled : disabled
    for (const id of [mod.modId, ...mod.provides]) {
      if (!id) continue
      const key = id.toLowerCase()
      target.add(key)

      const existing = byId.get(key)
      if (!existing || (!existing.enabled && mod.enabled)) byId.set(key, mod)
    }
  }

  return { enabled, disabled, byId }
}

function findMissingDependencies(
  mods: ModFile[],
  provided: ProvidedIds,
  physicalSide: PhysicalSide
): MissingDependency[] {
  const missing = new Map<string, MissingDependency>()

  for (const mod of mods) {
    if (!mod.enabled) continue

    for (const dependency of mod.dependencies) {
      if (dependency.kind !== 'required') continue

      if (dependency.side !== null && dependency.side !== 'both' && dependency.side !== physicalSide) {
        continue
      }

      const id = dependency.modId.toLowerCase()
      if (IMPLICIT_MOD_IDS.has(id) || provided.enabled.has(id)) continue

      const requiredBy = mod.name ?? mod.fileName
      const existing = missing.get(id)
      if (existing) {
        if (!existing.requiredBy.includes(requiredBy)) existing.requiredBy.push(requiredBy)
        continue
      }

      missing.set(id, {
        modId: dependency.modId,
        versionRange: dependency.versionRange,
        requiredBy: [requiredBy],
        presentButDisabled: provided.disabled.has(id)
      })
    }
  }

  return [...missing.values()].sort((a, b) => a.modId.localeCompare(b.modId))
}

function annotateProblems(
  mods: ModFile[],
  provided: ProvidedIds,
  physicalSide: PhysicalSide,
  conflicts: ModConflict[]
): void {
  const conflictsByDeclarer = new Map<string, string[]>()
  for (const conflict of conflicts) {
    const list = conflictsByDeclarer.get(conflict.declaredBy) ?? []
    list.push(conflict.modId)
    conflictsByDeclarer.set(conflict.declaredBy, list)
  }

  for (const mod of mods) {
    const missing: string[] = []
    const disabledDependencies: string[] = []

    if (mod.enabled) {
      for (const dependency of mod.dependencies) {
        if (dependency.kind !== 'required') continue
        if (dependency.side !== null && dependency.side !== 'both' && dependency.side !== physicalSide) {
          continue
        }

        const id = dependency.modId.toLowerCase()
        if (IMPLICIT_MOD_IDS.has(id) || provided.enabled.has(id)) continue

        if (provided.disabled.has(id)) disabledDependencies.push(dependency.modId)
        else missing.push(dependency.modId)
      }
    }

    mod.problems = {
      missing,
      disabledDependencies,
      conflictsWith: conflictsByDeclarer.get(mod.name ?? mod.fileName) ?? []
    }
  }
}

function findConflicts(mods: ModFile[], byId: Map<string, ModFile>): ModConflict[] {
  const conflicts: ModConflict[] = []

  for (const mod of mods) {
    if (!mod.enabled) continue

    for (const dependency of mod.dependencies) {
      if (dependency.kind !== 'incompatible') continue

      const id = dependency.modId.toLowerCase()
      const provider = byId.get(id)
      if (!provider || !provider.enabled || provider === mod) continue

      const installedVersion =
        provider.modId?.toLowerCase() === id ? provider.version : (provider.providedVersions[id] ?? null)
      if (satisfies(installedVersion, dependency.versionRange) !== true) continue

      conflicts.push({
        modId: dependency.modId,
        declaredBy: mod.name ?? mod.fileName,
        versionRange: dependency.versionRange,
        installedVersion
      })
    }
  }

  return conflicts.sort((a, b) => a.modId.localeCompare(b.modId))
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

function prettyNameFromFileName(fileName: string): string {
  const withoutExtension = fileName.replace(/\.jar(\.disabled|\.bak)?$/i, '')
  const withoutVersion = withoutExtension
    .replace(/[-_+](mc)?\d[\w.+]*$/i, '')
    .replace(/[-_+]?(forge|fabric|neoforge|quilt)$/i, '')
  return (withoutVersion || withoutExtension).replace(/[-_]+/g, ' ').trim()
}

function splitAuthors(raw: string | null): string[] {
  if (!raw) return []
  return raw
    .split(/,|;| and /i)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function readAuthorList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((entry) =>
      typeof entry === 'string' ? entry : asString((entry as Record<string, unknown>)?.['name'])
    )
    .filter((entry): entry is string => Boolean(entry))
}

function asString(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return null
}

function asStringArray(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is string => typeof entry === 'string')
}

function valueAt(source: unknown, path: string): unknown {
  let node = source
  for (const key of path.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined
    node = (node as Record<string, unknown>)[key]
  }
  return node
}
