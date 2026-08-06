import { basename, dirname, join } from 'node:path'
import { open, readFile, stat } from 'node:fs/promises'
import type { Instance, LauncherKind, LoaderKind, MemorySettings } from '@shared/types'
import { knownLauncherRoots } from './launchers'
import { readModrinthProfiles, type ModrinthProfileIndex } from './modrinthDb'
import {
  epochToIso,
  isDirectory,
  isFile,
  listDirectories,
  numberFrom,
  pathId,
  readJsonFile,
  readKeyValueFile
} from './fsutil'

interface DetectOptions {
  source: 'auto' | 'manual'
  hintLauncher?: LauncherKind

  containerRoot?: string

  modrinthProfiles?: ModrinthProfileIndex
}

const ICON_FILE_CANDIDATES = ['icon.png', 'instance-icon.png', '.icon.png', 'pack.png', 'icon.jpg']

const MAX_ICON_BYTES = 2 * 1024 * 1024

const SERVER_MARKER_FILES = [
  'server.properties',
  'eula.txt',
  'run.bat',
  'run.sh',
  'start.bat',
  'start.sh',
  'user_jvm_args.txt'
]

export async function scanKnownLaunchers(
  onProgress?: (launcher: LauncherKind, current: number, total: number) => void
): Promise<Instance[]> {
  const roots = await knownLauncherRoots()
  const found: Instance[] = []
  const seenPaths = new Set<string>()

  const modrinthProfiles = roots.some((root) => root.launcher === 'modrinth')
    ? await readModrinthProfiles()
    : undefined

  for (const [index, root] of roots.entries()) {
    onProgress?.(root.launcher, index, roots.length)

    const instances =
      root.kind === 'single'
        ? await collect(
            detectInstance(root.path, {
              source: 'auto',
              hintLauncher: root.launcher,
              modrinthProfiles
            })
          )
        : await scanContainer(root.path, root.launcher, modrinthProfiles)

    for (const instance of instances) {
      const key = instance.rootPath.toLowerCase()
      if (seenPaths.has(key)) continue
      seenPaths.add(key)
      found.push(instance)
    }
  }

  return found.sort((a, b) => a.name.localeCompare(b.name))
}

async function collect(promise: Promise<Instance | null>): Promise<Instance[]> {
  const result = await promise
  return result ? [result] : []
}

async function scanContainer(
  root: string,
  hintLauncher: LauncherKind,
  modrinthProfiles?: ModrinthProfileIndex
): Promise<Instance[]> {
  const names = await listDirectories(root)
  const results: Instance[] = []

  for (const name of names) {
    const instance = await detectInstance(join(root, name), {
      source: 'auto',
      hintLauncher,
      containerRoot: root,
      modrinthProfiles
    })
    if (instance) results.push(instance)
  }

  return results
}

export async function scanUserFolder(root: string): Promise<Instance[]> {
  if (!(await isDirectory(root))) return []

  const modrinthProfiles = await readModrinthProfiles()

  const direct = await detectInstance(root, { source: 'manual', modrinthProfiles })
  if (direct) return [direct]

  const results: Instance[] = []
  const seen = new Set<string>()

  const searchDirs = [root]
  for (const nested of ['instances', 'profiles', 'modpacks']) {
    const candidate = join(root, nested)
    if (await isDirectory(candidate)) searchDirs.push(candidate)
  }

  for (const dir of searchDirs) {
    for (const name of await listDirectories(dir)) {
      const instance = await detectInstance(join(dir, name), {
        source: 'manual',
        containerRoot: dir,
        modrinthProfiles
      })
      if (!instance) continue
      const key = instance.rootPath.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      results.push(instance)
    }
  }

  return results.sort((a, b) => a.name.localeCompare(b.name))
}

export async function detectInstance(folder: string, options: DetectOptions): Promise<Instance | null> {
  if (!(await isDirectory(folder))) return null

  if (await isFile(join(folder, 'minecraftinstance.json'))) return fromCurseForge(folder, options)

  if (await isFile(join(folder, 'profile.json'))) return fromModrinth(folder, options)
  if (options.hintLauncher === 'modrinth' && options.modrinthProfiles?.has(basename(folder).toLowerCase())) {
    return fromModrinth(folder, options)
  }
  if (await isFile(join(folder, 'mmc-pack.json'))) return fromMmc(folder, options)
  if (await isFile(join(folder, 'instance.json'))) return fromAtLauncher(folder, options)
  if (await isFile(join(folder, 'config.json'))) {
    const gd = await fromGdLauncher(folder, options)
    if (gd) return gd
  }
  if (await looksLikeVanilla(folder)) return fromVanilla(folder, options)
  if (await looksLikeServer(folder)) return fromServer(folder, options)

  return fromGenericFolder(folder, options)
}

async function fromCurseForge(folder: string, options: DetectOptions): Promise<Instance> {
  const manifest = await readJsonFile<Record<string, unknown>>(join(folder, 'minecraftinstance.json'))

  const loaderName =
    getString(manifest, 'baseModLoader.name') ??
    getString(manifest, 'baseModLoader.forgeVersion') ??
    getString(manifest, 'baseModLoader.type')
  const loader = parseLoaderId(loaderName)

  const allocatedMb = getNumber(manifest, 'allocatedMemory')

  return buildInstance({
    folder,
    gameDir: folder,
    launcher: 'curseforge',
    name: getString(manifest, 'name') ?? basename(folder),
    minecraftVersion: getString(manifest, 'gameVersion') ?? getString(manifest, 'baseModLoader.minecraftVersion'),
    loader: loader.kind,
    loaderVersion: loader.version,
    lastPlayedIso: normaliseIsoDate(getString(manifest, 'lastPlayed')),
    memory: allocatedMb ? { minMb: null, maxMb: allocatedMb, overridden: true } : null,
    javaArgs: getString(manifest, 'javaArgsOverride'),
    options
  })
}

async function fromModrinth(folder: string, options: DetectOptions): Promise<Instance> {
  const profile = await readJsonFile<Record<string, unknown>>(join(folder, 'profile.json'))
  const fromDatabase = options.modrinthProfiles?.get(basename(folder).toLowerCase()) ?? null

  const loaderName = getString(profile, 'loader', 'metadata.loader')
  const loaderVersion = getString(profile, 'loader_version.id', 'metadata.loader_version.id', 'loader_version')
  const maxMemory = getNumber(profile, 'memory.maximum', 'settings.memory.maximum')

  return buildInstance({
    folder,
    gameDir: folder,
    launcher: 'modrinth',

    name: fromDatabase?.name ?? getString(profile, 'name', 'metadata.name', 'path') ?? basename(folder),
    iconPath: fromDatabase?.iconPath ?? null,
    minecraftVersion: getString(profile, 'game_version', 'metadata.game_version'),
    loader: parseLoaderId(loaderName).kind,
    loaderVersion: loaderVersion ?? parseLoaderId(loaderName).version,
    lastPlayedIso:
      epochToIso(fromDatabase?.lastPlayed ?? null) ??
      normaliseIsoDate(getString(profile, 'last_played', 'metadata.last_played')),
    memory: maxMemory ? { minMb: null, maxMb: maxMemory, overridden: true } : null,
    javaArgs: getString(profile, 'java.extra_arguments', 'hooks.pre_launch'),
    options
  })
}

async function fromMmc(folder: string, options: DetectOptions): Promise<Instance> {
  const gameDir = (await isDirectory(join(folder, '.minecraft')))
    ? join(folder, '.minecraft')
    : join(folder, 'minecraft')

  const pack = await readJsonFile<Record<string, unknown>>(join(folder, 'mmc-pack.json'))
  const cfg = await readKeyValueFile(join(folder, 'instance.cfg'))

  let minecraftVersion: string | null = null
  let loader: LoaderKind = 'vanilla'
  let loaderVersion: string | null = null

  const components = getArray(pack, 'components')
  for (const component of components) {
    const uid = getString(component, 'uid') ?? ''
    const version = getString(component, 'version')

    if (uid === 'net.minecraft') minecraftVersion = version
    else if (uid.includes('neoforge')) [loader, loaderVersion] = ['neoforge', version]
    else if (uid.includes('minecraftforge')) [loader, loaderVersion] = ['forge', version]
    else if (uid.includes('quilt-loader')) [loader, loaderVersion] = ['quilt', version]
    else if (uid.includes('fabric-loader')) [loader, loaderVersion] = ['fabric', version]
  }

  const overrideMemory = cfg.get('OverrideMemory')?.toLowerCase() === 'true'

  return buildInstance({
    folder,
    gameDir: (await isDirectory(gameDir)) ? gameDir : folder,
    launcher: options.hintLauncher === 'multimc' ? 'multimc' : 'prism',
    name: cfg.get('name') || basename(folder),
    minecraftVersion,
    loader,
    loaderVersion,
    lastPlayedIso: epochToIso(numberFrom(cfg.get('lastLaunchTime'))),
    memory: {
      minMb: numberFrom(cfg.get('MinMemAlloc')),
      maxMb: numberFrom(cfg.get('MaxMemAlloc')),
      overridden: overrideMemory
    },
    javaArgs: cfg.get('JvmArgs') || null,
    iconKey: cfg.get('iconKey') || null,
    options
  })
}

async function fromAtLauncher(folder: string, options: DetectOptions): Promise<Instance> {
  const manifest = await readJsonFile<Record<string, unknown>>(join(folder, 'instance.json'))

  const loaderType = getString(manifest, 'loaderVersion.type')
  const loaderVersion = getString(manifest, 'loaderVersion.version')
  const maxMemory = getNumber(manifest, 'launcher.maximumMemory', 'settings.maximumMemory')

  return buildInstance({
    folder,
    gameDir: folder,
    launcher: 'atlauncher',
    name: getString(manifest, 'launcher.name', 'name') ?? basename(folder),
    minecraftVersion: getString(manifest, 'id', 'minecraftVersion', 'launcher.version'),
    loader: parseLoaderId(loaderType).kind,
    loaderVersion,
    lastPlayedIso: normaliseIsoDate(getString(manifest, 'launcher.lastPlayed')),
    memory: maxMemory ? { minMb: null, maxMb: maxMemory, overridden: true } : null,
    javaArgs: getString(manifest, 'launcher.javaArguments', 'settings.javaArguments'),
    options
  })
}

async function fromGdLauncher(folder: string, options: DetectOptions): Promise<Instance | null> {
  const config = await readJsonFile<Record<string, unknown>>(join(folder, 'config.json'))
  const loaderType = getString(config, 'loader.loaderType', 'modloader.type')
  const mcVersion = getString(config, 'loader.mcVersion', 'mcVersion', 'modloader.mcVersion')
  if (!loaderType && !mcVersion) return null

  return buildInstance({
    folder,
    gameDir: folder,
    launcher: 'gdlauncher',
    name: getString(config, 'name') ?? basename(folder),
    minecraftVersion: mcVersion,
    loader: parseLoaderId(loaderType).kind,
    loaderVersion: getString(config, 'loader.loaderVersion', 'modloader.version'),
    lastPlayedIso: null,
    memory: null,
    javaArgs: null,
    options
  })
}

async function fromVanilla(folder: string, options: DetectOptions): Promise<Instance> {
  const profiles = await readJsonFile<Record<string, unknown>>(join(folder, 'launcher_profiles.json'))
  const selected = getString(profiles, 'selectedProfile')

  return buildInstance({
    folder,
    gameDir: folder,
    launcher: 'vanilla',
    name: selected ? `Minecraft (${selected})` : 'Minecraft (Vanilla)',
    minecraftVersion: await newestVanillaVersion(folder),
    loader: (await isDirectory(join(folder, 'mods'))) ? 'unknown' : 'vanilla',
    loaderVersion: null,
    lastPlayedIso: null,
    memory: null,
    javaArgs: null,
    options
  })
}

async function fromServer(folder: string, options: DetectOptions): Promise<Instance> {
  const properties = await readKeyValueFile(join(folder, 'server.properties'))
  const jvmArgs = await readKeyValueFile(join(folder, 'user_jvm_args.txt'))

  return buildInstance({
    folder,
    gameDir: folder,
    launcher: 'server',

    name: properties.get('motd')?.replace(/\u00a7./g, '').trim() || basename(folder),
    minecraftVersion: null,
    loader: 'unknown',
    loaderVersion: null,
    lastPlayedIso: null,
    memory: null,
    javaArgs: [...jvmArgs.keys()].filter((key) => key.startsWith('-')).join(' ') || null,
    isServer: true,
    options
  })
}

async function fromGenericFolder(folder: string, options: DetectOptions): Promise<Instance | null> {
  const nested = join(folder, '.minecraft')
  const hasNestedMods = await isDirectory(join(nested, 'mods'))
  const hasDirectMods = await isDirectory(join(folder, 'mods'))
  if (!hasNestedMods && !hasDirectMods) return null

  return buildInstance({
    folder,
    gameDir: hasNestedMods ? nested : folder,
    launcher: options.hintLauncher ?? 'custom',
    name: basename(folder),
    minecraftVersion: null,
    loader: 'unknown',
    loaderVersion: null,
    lastPlayedIso: null,
    memory: null,
    javaArgs: null,
    options
  })
}

interface BuildArgs {
  folder: string
  gameDir: string
  launcher: LauncherKind
  name: string
  minecraftVersion: string | null
  loader: LoaderKind | null
  loaderVersion: string | null
  lastPlayedIso: string | null
  memory: MemorySettings | null
  javaArgs: string | null
  iconKey?: string | null

  iconPath?: string | null
  isServer?: boolean
  options: DetectOptions
}

async function buildInstance(args: BuildArgs): Promise<Instance> {
  let minecraftVersion = args.minecraftVersion
  let loader = args.loader
  let loaderVersion = args.loaderVersion

  if (minecraftVersion === null || loader === null || loader === 'unknown') {
    const hints = await inferFromLogs(args.gameDir)
    minecraftVersion ??= hints.minecraftVersion
    if ((loader === null || loader === 'unknown') && hints.loader !== null) {
      loader = hints.loader
      loaderVersion ??= hints.loaderVersion
    }
  }

  return {
    id: pathId(args.folder),
    name: args.name.trim() || basename(args.folder),
    rootPath: args.folder,
    gameDir: args.gameDir,
    launcher: args.launcher,
    minecraftVersion,
    loader,
    loaderVersion,
    iconDataUrl: await findIcon(
      args.folder,
      args.gameDir,
      args.iconKey ?? null,
      args.options.containerRoot,
      args.iconPath ?? null
    ),
    lastPlayedIso: args.lastPlayedIso,
    isServer: args.isServer ?? args.launcher === 'server',
    memory: args.memory,
    javaArgs: args.javaArgs,
    source: args.options.source
  }
}

interface RuntimeHints {
  minecraftVersion: string | null
  loader: LoaderKind | null
  loaderVersion: string | null
}

const LOG_HEAD_BYTES = 64 * 1024
const NO_HINTS: RuntimeHints = { minecraftVersion: null, loader: null, loaderVersion: null }

async function inferFromLogs(gameDir: string): Promise<RuntimeHints> {
  const head =
    (await readFileHead(join(gameDir, 'logs', 'latest.log'))) ??
    (await readFileHead(join(gameDir, 'logs', 'debug.log')))
  if (head === null) return NO_HINTS

  const fabricLike = /Loading Minecraft (\S+) with (Fabric|Quilt) Loader (\S+)/i.exec(head)
  if (fabricLike) {
    return {
      minecraftVersion: fabricLike[1] ?? null,
      loader: fabricLike[2]?.toLowerCase() === 'quilt' ? 'quilt' : 'fabric',
      loaderVersion: fabricLike[3] ?? null
    }
  }

  const mcVersion = matchArgument(head, 'fml\\.mcVersion') ?? matchArgument(head, 'version')
  const neoForge = matchArgument(head, 'fml\\.neoForgeVersion')
  if (neoForge) return { minecraftVersion: mcVersion, loader: 'neoforge', loaderVersion: neoForge }

  const forge = matchArgument(head, 'fml\\.forgeVersion')
  if (forge) return { minecraftVersion: mcVersion, loader: 'forge', loaderVersion: forge }

  return { minecraftVersion: sanitiseVersion(mcVersion), loader: null, loaderVersion: null }
}

function matchArgument(log: string, name: string): string | null {
  return new RegExp(`--${name},\\s*([^\\s,\\]]+)`).exec(log)?.[1] ?? null
}

function sanitiseVersion(raw: string | null): string | null {
  if (raw === null) return null
  if (/^\d+\.\d+(\.\d+)?$/.test(raw)) return raw
  return /(\d+\.\d+(?:\.\d+)?)$/.exec(raw)?.[1] ?? null
}

async function readFileHead(path: string): Promise<string | null> {
  try {
    const handle = await open(path, 'r')
    try {
      const buffer = Buffer.allocUnsafe(LOG_HEAD_BYTES)
      const { bytesRead } = await handle.read(buffer, 0, LOG_HEAD_BYTES, 0)
      return bytesRead > 0 ? buffer.subarray(0, bytesRead).toString('utf8') : null
    } finally {
      await handle.close().catch(() => undefined)
    }
  } catch {
    return null
  }
}

async function looksLikeVanilla(folder: string): Promise<boolean> {
  if (await isFile(join(folder, 'launcher_profiles.json'))) return true
  return (await isDirectory(join(folder, 'versions'))) && (await isDirectory(join(folder, 'assets')))
}

async function looksLikeServer(folder: string): Promise<boolean> {
  if (!(await isDirectory(join(folder, 'mods')))) return false

  for (const marker of SERVER_MARKER_FILES) {
    if (await isFile(join(folder, marker))) return true
  }
  return isDirectory(join(folder, 'libraries'))
}

async function newestVanillaVersion(folder: string): Promise<string | null> {
  const versions = await listDirectories(join(folder, 'versions'))
  if (versions.length === 0) return null

  const releases = versions.filter((name) => /^\d+\.\d+(\.\d+)?$/.test(name))
  const pool = releases.length > 0 ? releases : versions
  return pool.sort(compareVersionStrings).at(-1) ?? null
}

function compareVersionStrings(a: string, b: string): number {
  const parse = (value: string): number[] => value.split('.').map((part) => Number.parseInt(part, 10) || 0)
  const left = parse(a)
  const right = parse(b)
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0)
    if (diff !== 0) return diff
  }
  return a.localeCompare(b)
}

async function findIcon(
  folder: string,
  gameDir: string,
  iconKey: string | null,
  containerRoot?: string,
  explicitPath?: string | null
): Promise<string | null> {
  const candidates: string[] = []

  if (explicitPath) candidates.push(explicitPath)

  for (const name of ICON_FILE_CANDIDATES) {
    candidates.push(join(folder, name), join(gameDir, name))
  }

  if (iconKey && containerRoot) {
    const iconStore = join(dirname(containerRoot), 'icons')
    candidates.push(join(iconStore, `${iconKey}.png`), join(iconStore, iconKey))
  }

  for (const candidate of candidates) {
    const dataUrl = await readAsDataUrl(candidate)
    if (dataUrl) return dataUrl
  }
  return null
}

async function readAsDataUrl(path: string): Promise<string | null> {
  try {
    const info = await stat(path)
    if (!info.isFile() || info.size === 0 || info.size > MAX_ICON_BYTES) return null
    const buffer = await readFile(path)
    return `data:${mimeForImage(path)};base64,${buffer.toString('base64')}`
  } catch {
    return null
  }
}

function mimeForImage(path: string): string {
  const lower = path.toLowerCase()
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.gif')) return 'image/gif'
  return 'image/png'
}

function parseLoaderId(raw: string | null): { kind: LoaderKind; version: string | null } {
  if (!raw) return { kind: 'unknown', version: null }

  const lower = raw.toLowerCase()
  const version = /[-\s]([\d][\w.+-]*)$/.exec(raw)?.[1] ?? null

  if (lower.includes('neoforge')) return { kind: 'neoforge', version }
  if (lower.includes('quilt')) return { kind: 'quilt', version }
  if (lower.includes('fabric')) return { kind: 'fabric', version }
  if (lower.includes('forge')) return { kind: 'forge', version }
  if (lower.includes('vanilla')) return { kind: 'vanilla', version: null }
  return { kind: 'unknown', version }
}

function normaliseIsoDate(raw: string | null): string | null {
  if (!raw) return null
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function valueAt(source: unknown, path: string): unknown {
  let node = source
  for (const key of path.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined
    node = (node as Record<string, unknown>)[key]
  }
  return node
}

function getString(source: unknown, ...paths: string[]): string | null {
  for (const path of paths) {
    const value = valueAt(source, path)
    if (typeof value === 'string' && value.trim() !== '') return value.trim()
    if (typeof value === 'number') return String(value)
  }
  return null
}

function getNumber(source: unknown, ...paths: string[]): number | null {
  for (const path of paths) {
    const value = valueAt(source, path)
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string') {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return null
}

function getArray(source: unknown, path: string): unknown[] {
  const value = valueAt(source, path)
  return Array.isArray(value) ? value : []
}
