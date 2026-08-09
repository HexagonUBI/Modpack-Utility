import { app } from 'electron'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type {
  ReleaseInfo,
  UpdateChannel,
  UpdateErrorCode,
  UpdateInstallResult,
  UpdateProgress,
  UpdateStatus
} from '@shared/types'

const DEFAULT_REPO = 'HexagonUBI/Modpack-Utility'
const API_ROOT = 'https://api.github.com'
const CHECK_TIMEOUT_MS = 15_000
const DOWNLOAD_TIMEOUT_MS = 900_000
const MAX_NOTES_CHARS = 24_000
const MAX_REMEMBERED_RELEASES = 8
const QUIT_DELAY_MS = 900
const PROGRESS_INTERVAL_MS = 120

const ALLOWED_DOWNLOAD_HOSTS = new Set([
  'github.com',
  'objects.githubusercontent.com',
  'release-assets.githubusercontent.com'
])

interface UpdateState {
  seenVersion: string | null
  lastCheckIso: string | null
  releases: ReleaseInfo[]
}

const EMPTY_STATE: UpdateState = { seenVersion: null, lastCheckIso: null, releases: [] }

let cachedStatus: UpdateStatus | null = null

function repoSlug(): string {
  const override = process.env['MODPACK_UTILITY_UPDATE_REPO']
  if (!app.isPackaged && override && /^[\w.-]+\/[\w.-]+$/.test(override)) return override
  return DEFAULT_REPO
}

function statePath(): string {
  return join(app.getPath('userData'), 'updates.json')
}

function downloadDir(): string {
  return join(app.getPath('temp'), 'modpack-utility-update')
}

export function updateChannel(): UpdateChannel {
  if (!app.isPackaged) return 'development'
  if (process.env['PORTABLE_EXECUTABLE_DIR']) return 'portable'
  return 'installer'
}

function parseVersion(value: string): { numbers: number[]; pre: string } | null {
  const cleaned = value.trim().replace(/^v/i, '')
  const match = /^(\d+(?:\.\d+)*)(?:[-+](.+))?$/.exec(cleaned)
  if (!match) return null
  return { numbers: match[1]!.split('.').map((part) => Number(part)), pre: match[2] ?? '' }
}

export function compareVersions(left: string, right: string): number {
  const a = parseVersion(left)
  const b = parseVersion(right)
  if (!a || !b) return 0

  const length = Math.max(a.numbers.length, b.numbers.length)
  for (let index = 0; index < length; index++) {
    const difference = (a.numbers[index] ?? 0) - (b.numbers[index] ?? 0)
    if (difference !== 0) return difference < 0 ? -1 : 1
  }

  if (a.pre === b.pre) return 0
  if (a.pre === '') return 1
  if (b.pre === '') return -1
  return a.pre < b.pre ? -1 : 1
}

async function readState(): Promise<UpdateState> {
  try {
    const raw = await readFile(statePath(), 'utf8')
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const releases = parsed['releases']

    return {
      seenVersion: typeof parsed['seenVersion'] === 'string' ? parsed['seenVersion'] : null,
      lastCheckIso: typeof parsed['lastCheckIso'] === 'string' ? parsed['lastCheckIso'] : null,
      releases: Array.isArray(releases) ? releases.filter(isReleaseInfo) : []
    }
  } catch {
    return { ...EMPTY_STATE, releases: [] }
  }
}

async function writeState(state: UpdateState): Promise<void> {
  const path = statePath()
  try {
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
  } catch {
  }
}

function isReleaseInfo(value: unknown): value is ReleaseInfo {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return typeof record['version'] === 'string' && typeof record['notes'] === 'string'
}

async function rememberRelease(release: ReleaseInfo): Promise<void> {
  const state = await readState()
  const kept = state.releases.filter((entry) => entry.version !== release.version)
  await writeState({
    ...state,
    releases: [release, ...kept].slice(0, MAX_REMEMBERED_RELEASES)
  })
}

function apiHeaders(): Record<string, string> {
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': `ModpackUtility/${app.getVersion()}`
  }
}

function errorForStatus(status: number): UpdateErrorCode {
  if (status === 404) return 'notPublished'
  if (status === 403 || status === 429) return 'rateLimited'
  return 'offline'
}

function readRelease(raw: unknown): ReleaseInfo | null {
  if (typeof raw !== 'object' || raw === null) return null
  const record = raw as Record<string, unknown>

  const tagName = typeof record['tag_name'] === 'string' ? record['tag_name'] : ''
  const version = tagName.trim().replace(/^v/i, '')
  if (parseVersion(version) === null) return null

  const title = typeof record['name'] === 'string' && record['name'].length > 0 ? record['name'] : null
  const notes = typeof record['body'] === 'string' ? record['body'].slice(0, MAX_NOTES_CHARS) : ''
  const published = typeof record['published_at'] === 'string' ? record['published_at'] : null
  const htmlUrl =
    typeof record['html_url'] === 'string' && record['html_url'].startsWith('https://')
      ? record['html_url']
      : `https://github.com/${repoSlug()}/releases`

  const asset = pickInstaller(record['assets'])

  return {
    version,
    tagName,
    title,
    notes,
    publishedIso: published,
    htmlUrl,
    downloadUrl: asset?.url ?? null,
    downloadSizeBytes: asset?.size ?? null
  }
}

interface ReleaseAsset {
  name: string
  url: string
  size: number | null
}

function readAssets(raw: unknown): ReleaseAsset[] {
  if (!Array.isArray(raw)) return []

  const assets: ReleaseAsset[] = []
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue
    const record = entry as Record<string, unknown>
    const name = record['name']
    const url = record['browser_download_url']
    if (typeof name !== 'string' || typeof url !== 'string') continue
    if (!isAllowedDownload(url)) continue

    assets.push({
      name,
      url,
      size: typeof record['size'] === 'number' && record['size'] > 0 ? record['size'] : null
    })
  }
  return assets
}

function pickInstaller(raw: unknown): ReleaseAsset | null {
  const assets = readAssets(raw)
  const setup = assets.find((asset) => /setup\.exe$/i.test(asset.name))
  if (setup) return setup
  return assets.find((asset) => /\.exe$/i.test(asset.name) && !/portable/i.test(asset.name)) ?? null
}

function isAllowedDownload(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && ALLOWED_DOWNLOAD_HOSTS.has(parsed.hostname)
  } catch {
    return false
  }
}

async function fetchRelease(path: string): Promise<{ release: ReleaseInfo | null; error: UpdateErrorCode | null }> {
  try {
    const response = await fetch(`${API_ROOT}/repos/${repoSlug()}/${path}`, {
      headers: apiHeaders(),
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS)
    })

    if (!response.ok) return { release: null, error: errorForStatus(response.status) }

    const release = readRelease(await response.json())
    return release === null ? { release: null, error: 'notPublished' } : { release, error: null }
  } catch {
    return { release: null, error: 'offline' }
  }
}

export async function checkForUpdate(): Promise<UpdateStatus> {
  const currentVersion = app.getVersion()
  const channel = updateChannel()
  const checkedIso = new Date().toISOString()

  const { release, error } = await fetchRelease('releases/latest')

  const state = await readState()
  await writeState({ ...state, lastCheckIso: checkedIso })

  if (release === null) {
    cachedStatus = { currentVersion, available: null, checkedIso, error, channel }
    return cachedStatus
  }

  await rememberRelease(release)

  const isNewer = compareVersions(release.version, currentVersion) > 0
  cachedStatus = {
    currentVersion,
    available: isNewer ? release : null,
    checkedIso,
    error: null,
    channel
  }
  return cachedStatus
}

export async function lastStatus(): Promise<UpdateStatus> {
  if (cachedStatus) return cachedStatus

  const state = await readState()
  return {
    currentVersion: app.getVersion(),
    available: null,
    checkedIso: state.lastCheckIso,
    error: null,
    channel: updateChannel()
  }
}

async function releaseForVersion(
  version: string
): Promise<{ release: ReleaseInfo | null; error: UpdateErrorCode | null }> {
  const state = await readState()
  const remembered = state.releases.find((entry) => entry.version === version)
  if (remembered) return { release: remembered, error: null }

  let lastError: UpdateErrorCode | null = null
  for (const tag of [`v${version}`, version]) {
    const { release, error } = await fetchRelease(`releases/tags/${encodeURIComponent(tag)}`)
    if (release) {
      await rememberRelease(release)
      return { release, error: null }
    }
    lastError = error
  }
  return { release: null, error: lastError }
}

export async function changelogFor(version: string): Promise<ReleaseInfo | null> {
  return (await releaseForVersion(version)).release
}

export async function pendingChangelog(): Promise<ReleaseInfo | null> {
  const currentVersion = app.getVersion()
  const state = await readState()

  if (state.seenVersion === null) {
    await writeState({ ...state, seenVersion: currentVersion })
    return null
  }

  if (state.seenVersion === currentVersion) return null
  if (compareVersions(currentVersion, state.seenVersion) <= 0) {
    await writeState({ ...state, seenVersion: currentVersion })
    return null
  }

  const { release, error } = await releaseForVersion(currentVersion)
  if (release !== null) return release

  if (error === 'notPublished') await writeState({ ...state, seenVersion: currentVersion })
  return null
}

export async function acknowledgeChangelog(version: string): Promise<void> {
  const state = await readState()
  await writeState({ ...state, seenVersion: version })
}

async function expectedHash(release: ReleaseInfo, assetName: string): Promise<string | null> {
  try {
    const response = await fetch(`${API_ROOT}/repos/${repoSlug()}/releases/tags/${encodeURIComponent(release.tagName)}`, {
      headers: apiHeaders(),
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS)
    })
    if (!response.ok) return null

    const record = (await response.json()) as Record<string, unknown>
    const manifest = readAssets(record['assets']).find((asset) => /^latest.*\.yml$/i.test(asset.name))
    if (!manifest) return null

    const text = await (
      await fetch(manifest.url, { signal: AbortSignal.timeout(CHECK_TIMEOUT_MS) })
    ).text()

    return readManifestHash(text, assetName)
  } catch {
    return null
  }
}

export function readManifestHash(manifest: string, assetName: string): string | null {
  let currentFile: string | null = null

  for (const line of manifest.split(/\r?\n/)) {
    const file = /^\s*-?\s*(?:url|path):\s*(.+?)\s*$/.exec(line)
    if (file) {
      currentFile = file[1]!.replace(/^["']|["']$/g, '')
      continue
    }

    const hash = /^\s*-?\s*sha512:\s*(.+?)\s*$/.exec(line)
    if (hash && currentFile === assetName) return hash[1]!.replace(/^["']|["']$/g, '')
  }
  return null
}

function fileNameFor(url: string): string {
  const raw = decodeURIComponent(new URL(url).pathname.split('/').pop() ?? 'update.exe')
  const safe = raw.replace(/[^\w.-]/g, '_')
  return safe.toLowerCase().endsWith('.exe') ? safe : `${safe}.exe`
}

export async function downloadAndInstall(
  onProgress: (progress: UpdateProgress) => void
): Promise<UpdateInstallResult> {
  const status = cachedStatus ?? (await checkForUpdate())
  const release = status.available

  if (release === null) return { ok: false, error: status.error ?? 'notPublished', detail: null }
  if (release.downloadUrl === null || !isAllowedDownload(release.downloadUrl)) {
    return { ok: false, error: 'noAsset', detail: null }
  }

  const target = join(downloadDir(), fileNameFor(release.downloadUrl))
  let received = 0

  try {
    await rm(downloadDir(), { recursive: true, force: true })
    await mkdir(downloadDir(), { recursive: true })

    const response = await fetch(release.downloadUrl, {
      headers: { 'User-Agent': `ModpackUtility/${app.getVersion()}` },
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS)
    })
    if (!response.ok || response.body === null) {
      return { ok: false, error: 'downloadFailed', detail: String(response.status) }
    }

    const declared = Number(response.headers.get('content-length') ?? 0)
    const total = declared > 0 ? declared : (release.downloadSizeBytes ?? 0)
    const digest = createHash('sha512')
    let lastReport = 0

    onProgress({ phase: 'downloading', receivedBytes: 0, totalBytes: total })

    const meter = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        received += chunk.length
        digest.update(chunk)

        const now = Date.now()
        if (now - lastReport >= PROGRESS_INTERVAL_MS) {
          lastReport = now
          onProgress({ phase: 'downloading', receivedBytes: received, totalBytes: total })
        }
        callback(null, chunk)
      }
    })

    const source = Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0])
    await pipeline(source, meter, createWriteStream(target))

    onProgress({ phase: 'downloading', receivedBytes: received, totalBytes: total })
    onProgress({ phase: 'verifying' })

    if (release.downloadSizeBytes !== null && received !== release.downloadSizeBytes) {
      return { ok: false, error: 'verifyFailed', detail: null }
    }

    const expected = await expectedHash(release, fileNameFor(release.downloadUrl))
    if (expected !== null && expected !== digest.digest('base64')) {
      return { ok: false, error: 'verifyFailed', detail: null }
    }
  } catch (error) {
    return {
      ok: false,
      error: 'downloadFailed',
      detail: error instanceof Error ? error.message : null
    }
  }

  await rememberRelease(release)

  try {
    const child = spawn(target, ['--updated', '/S', '--force-run'], {
      detached: true,
      stdio: 'ignore'
    })
    child.unref()
  } catch (error) {
    return {
      ok: false,
      error: 'launchFailed',
      detail: error instanceof Error ? error.message : null
    }
  }

  onProgress({ phase: 'restarting' })
  setTimeout(() => app.quit(), QUIT_DELAY_MS)

  return { ok: true, error: null, detail: null }
}
