import { app, BrowserWindow, dialog, ipcMain, nativeImage, shell } from 'electron'
import { rm } from 'node:fs/promises'
import { dirname, isAbsolute, join, parse } from 'node:path'
import type {
  AppSettings,
  ConfigDocument,
  ConfigWriteResult,
  ContentResult,
  Instance,
  InstanceAnalysis,
  InstanceSize,
  ModsReport,
  ReleaseInfo,
  ResourcePackReport,
  ScanProgress,
  ScreenshotReport,
  SettingValue,
  SizeNode,
  StorageReport,
  TrashResult,
  UpdateInstallResult,
  UpdateProgress,
  UpdateStatus
} from '@shared/types'
import { scanKnownLaunchers, scanUserFolder } from './scanner/detect'
import { readMods } from './scanner/mods'
import { readConfigs } from './scanner/configs'
import { analyseStorage, listDirectoryWithSizes, measureDirectory } from './scanner/sizes'
import {
  readResourcePacks,
  readScreenshots,
  setModEnabled,
  setResourcePackEnabled
} from './scanner/content'
import { readConfigDocument, writeConfigChanges } from './scanner/configFile'
import { readSettings, writeSettings } from './settings'
import {
  acknowledgeChangelog,
  changelogFor,
  checkForUpdate,
  downloadAndInstall,
  lastStatus,
  pendingChangelog
} from './updater'

export const CHANNELS = {
  scanInstances: 'instances:scan',
  instanceSizes: 'instances:sizes',
  pickFolder: 'instances:pickFolder',
  getSettings: 'settings:get',
  setSettings: 'settings:set',
  analyseInstance: 'instance:analysis',
  analyseStorage: 'instance:storage',
  listDirectory: 'fs:listDirectory',
  readConfigFile: 'config:read',
  writeConfigFile: 'config:write',
  setModEnabled: 'mods:setEnabled',
  setPackEnabled: 'packs:setEnabled',
  resourcePacks: 'instance:resourcePacks',
  screenshots: 'instance:screenshots',
  thumbnails: 'instance:thumbnails',
  trash: 'files:trash',
  openPath: 'shell:openPath',
  revealPath: 'shell:revealPath',
  openExternal: 'shell:openExternal',
  appVersion: 'app:version',
  updateStatus: 'update:status',
  updateInstall: 'update:install',
  updateChangelog: 'update:changelog',
  updateAcknowledge: 'update:acknowledge',
  progress: 'scan:progress',
  updateProgress: 'update:progress'
} as const

const THUMBNAIL_WIDTH = 320
const MAX_THUMBNAILS_PER_CALL = 60
const MOD_ICON_PIXELS = 64
const SIZE_SCAN_CONCURRENCY = 4

async function mapWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = cursor++
      if (index >= items.length) return
      await fn(items[index]!)
    }
  })
  await Promise.all(workers)
}

export function registerIpcHandlers(): void {
  ipcMain.handle(CHANNELS.scanInstances, async (event): Promise<Instance[]> => {
    const settings = await readSettings()

    const known = await scanKnownLaunchers((launcher, current, total) => {
      event.sender.send(CHANNELS.progress, {
        phase: 'launchers',
        launcher,
        current,
        total
      } satisfies ScanProgress)
    })

    const extra = (await Promise.all(settings.extraFolders.map((folder) => scanUserFolder(folder)))).flat()

    const byPath = new Map<string, Instance>()
    for (const instance of [...known, ...extra]) {
      byPath.set(instance.rootPath.toLowerCase(), instance)
    }
    return [...byPath.values()].sort((a, b) => a.name.localeCompare(b.name))
  })

  ipcMain.handle(CHANNELS.instanceSizes, async (event, request: unknown): Promise<InstanceSize[]> => {
    if (!Array.isArray(request)) throw new Error('Expected a list of instances to measure')

    const targets = request.map((entry) => {
      const record = entry as Record<string, unknown>
      return {
        id: String(record['id'] ?? ''),

        name: String(record['name'] ?? ''),
        path: requireAbsolutePath(record['path'])
      }
    })

    const results: InstanceSize[] = []
    let completed = 0

    await mapWithConcurrency(targets, SIZE_SCAN_CONCURRENCY, async (target) => {
      const measured = await measureDirectory(target.path)
      results.push({ id: target.id, sizeBytes: measured.sizeBytes, fileCount: measured.fileCount })

      completed++
      event.sender.send(CHANNELS.progress, {
        phase: 'instances',
        name: target.name,
        current: completed,
        total: targets.length
      } satisfies ScanProgress)
    })

    return results
  })

  ipcMain.handle(CHANNELS.getSettings, async (): Promise<AppSettings> => readSettings())

  ipcMain.handle(CHANNELS.setSettings, async (_event, patch: unknown): Promise<AppSettings> =>
    writeSettings(patch)
  )

  ipcMain.handle(CHANNELS.pickFolder, async (event, title: unknown): Promise<Instance[]> => {
    const options = pickFolderOptions(typeof title === 'string' ? title : '')
    const window = BrowserWindow.fromWebContents(event.sender)
    const result = window
      ? await dialog.showOpenDialog(window, options)
      : await dialog.showOpenDialog(options)

    if (result.canceled || result.filePaths.length === 0) return []

    const found = (await Promise.all(result.filePaths.map((folder) => scanUserFolder(folder)))).flat()

    if (found.length > 0) {
      const settings = await readSettings()
      const merged = new Set([...settings.extraFolders, ...result.filePaths])
      await writeSettings({ extraFolders: [...merged] })
    }

    return found
  })

  ipcMain.handle(CHANNELS.analyseInstance, async (_event, request: unknown): Promise<InstanceAnalysis> => {
    const { gameDir, isServer } = readAnalysisRequest(request)
    const mods = await readMods(join(gameDir, 'mods'), isServer ? 'server' : 'client')
    const configs = await readConfigs(join(gameDir, 'config'), mods.mods, gameDir)
    return { mods: downscaleModIcons(mods), configs }
  })

  ipcMain.handle(CHANNELS.analyseStorage, async (event, rootPath: unknown): Promise<StorageReport> => {
    return analyseStorage(requireAbsolutePath(rootPath), {
      onProgress: (filesScanned, relativePath) => {
        event.sender.send(CHANNELS.progress, {
          phase: 'files',
          relativePath,
          current: filesScanned,
          total: 0
        } satisfies ScanProgress)
      }
    })
  })

  ipcMain.handle(CHANNELS.listDirectory, async (_event, path: unknown): Promise<SizeNode[]> => {
    return listDirectoryWithSizes(requireAbsolutePath(path))
  })

  ipcMain.handle(CHANNELS.readConfigFile, async (_event, path: unknown): Promise<ConfigDocument> => {
    return readConfigDocument(requireAbsolutePath(path))
  })

  ipcMain.handle(CHANNELS.writeConfigFile, async (_event, request: unknown): Promise<ConfigWriteResult> => {
    if (typeof request !== 'object' || request === null) throw new Error('Expected a write request')
    const record = request as Record<string, unknown>
    const changes = record['changes']
    if (!Array.isArray(changes)) throw new Error('Expected a list of changes')

    return writeConfigChanges(
      requireAbsolutePath(record['path']),
      changes.map((entry) => {
        const change = entry as Record<string, unknown>
        return { key: String(change['key'] ?? ''), value: change['value'] as SettingValue }
      })
    )
  })

  ipcMain.handle(CHANNELS.setModEnabled, async (_event, request: unknown): Promise<ContentResult> => {
    if (typeof request !== 'object' || request === null) throw new Error('Expected a request')
    const record = request as Record<string, unknown>
    return setModEnabled(requireAbsolutePath(record['path']), record['enabled'] === true)
  })

  ipcMain.handle(CHANNELS.setPackEnabled, async (_event, request: unknown): Promise<ContentResult> => {
    if (typeof request !== 'object' || request === null) throw new Error('Expected a request')
    const record = request as Record<string, unknown>
    const name = record['name']
    if (typeof name !== 'string' || name.length === 0) throw new Error('Expected a pack name')

    return setResourcePackEnabled(
      requireAbsolutePath(record['gameDir']),
      name,
      record['enabled'] === true
    )
  })

  ipcMain.handle(CHANNELS.resourcePacks, async (_event, gameDir: unknown): Promise<ResourcePackReport> => {
    return readResourcePacks(requireAbsolutePath(gameDir))
  })

  ipcMain.handle(CHANNELS.screenshots, async (_event, gameDir: unknown): Promise<ScreenshotReport> => {
    return readScreenshots(requireAbsolutePath(gameDir))
  })

  ipcMain.handle(CHANNELS.thumbnails, async (_event, paths: unknown): Promise<Record<string, string>> => {
    if (!Array.isArray(paths)) throw new Error('Expected an array of paths')

    const result: Record<string, string> = {}
    for (const value of paths.slice(0, MAX_THUMBNAILS_PER_CALL)) {
      const path = requireAbsolutePath(value)
      try {
        const image = nativeImage.createFromPath(path)
        if (image.isEmpty()) continue
        result[path] = image.resize({ width: THUMBNAIL_WIDTH, quality: 'good' }).toDataURL()
      } catch {
      }
    }
    return result
  })

  ipcMain.handle(CHANNELS.trash, async (_event, request: unknown): Promise<TrashResult[]> => {
    const record = (typeof request === 'object' && request !== null ? request : {}) as Record<
      string,
      unknown
    >
    const paths = record['paths']
    if (!Array.isArray(paths)) throw new Error('Expected an array of paths')
    const permanent = record['permanent'] === true

    const results: TrashResult[] = []
    for (const value of paths) {
      let path: string
      try {
        path = requireDeletablePath(value)
      } catch (error) {
        results.push({
          path: String(value),
          ok: false,
          error: error instanceof Error ? error.message : null
        })
        continue
      }

      try {
        if (permanent) await rm(path, { recursive: true, force: true })
        else await shell.trashItem(path)
        results.push({ path, ok: true, error: null })
      } catch (error) {
        results.push({
          path,
          ok: false,
          error: error instanceof Error ? error.message : null
        })
      }
    }
    return results
  })

  ipcMain.handle(CHANNELS.openPath, async (_event, target: unknown): Promise<string> => {
    return shell.openPath(requireAbsolutePath(target))
  })

  ipcMain.handle(CHANNELS.revealPath, async (_event, target: unknown): Promise<void> => {
    shell.showItemInFolder(requireAbsolutePath(target))
  })

  ipcMain.handle(CHANNELS.openExternal, async (_event, target: unknown): Promise<void> => {
    if (typeof target !== 'string' || !target.startsWith('https://')) {
      throw new Error('Expected an https link')
    }
    await shell.openExternal(target)
  })

  ipcMain.handle(CHANNELS.appVersion, async (): Promise<string> => app.getVersion())

  ipcMain.handle(CHANNELS.updateStatus, async (_event, force: unknown): Promise<UpdateStatus> =>
    force === true ? checkForUpdate() : lastStatus()
  )

  ipcMain.handle(CHANNELS.updateInstall, async (event): Promise<UpdateInstallResult> =>
    downloadAndInstall((progress) => {
      if (event.sender.isDestroyed()) return
      event.sender.send(CHANNELS.updateProgress, progress satisfies UpdateProgress)
    })
  )

  ipcMain.handle(CHANNELS.updateChangelog, async (_event, version: unknown): Promise<ReleaseInfo | null> =>
    typeof version === 'string' && version.length > 0 ? changelogFor(version) : pendingChangelog()
  )

  ipcMain.handle(CHANNELS.updateAcknowledge, async (_event, version: unknown): Promise<void> => {
    if (typeof version !== 'string' || version.length === 0) return
    await acknowledgeChangelog(version)
  })
}

function downscaleModIcons(report: ModsReport): ModsReport {
  for (const mod of report.mods) {
    if (!mod.iconDataUrl) continue
    try {
      const image = nativeImage.createFromDataURL(mod.iconDataUrl)
      mod.iconDataUrl = image.isEmpty()
        ? null
        : image.resize({ width: MOD_ICON_PIXELS, height: MOD_ICON_PIXELS, quality: 'good' }).toDataURL()
    } catch {
      mod.iconDataUrl = null
    }
  }
  return report
}

function pickFolderOptions(title: string): Electron.OpenDialogOptions {
  return {
    title,
    properties: ['openDirectory', 'multiSelections']
  }
}

interface AnalysisRequest {
  gameDir: string
  isServer: boolean
}

function readAnalysisRequest(value: unknown): AnalysisRequest {
  if (typeof value !== 'object' || value === null) throw new Error('Expected an analysis request')
  const record = value as Record<string, unknown>
  return {
    gameDir: requireAbsolutePath(record['gameDir']),
    isServer: record['isServer'] === true
  }
}

function requireAbsolutePath(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0 || !isAbsolute(value)) {
    throw new Error('Expected an absolute filesystem path')
  }
  return value
}

function requireDeletablePath(value: unknown): string {
  const path = requireAbsolutePath(value)
  const { root } = parse(path)

  if (path === root || dirname(path) === root) {
    throw new Error('Refusing to delete a top-level directory')
  }
  return path
}
