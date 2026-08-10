import { contextBridge, ipcRenderer } from 'electron'
import type {
  AppSettings,
  ConfigDocument,
  ConfigWriteResult,
  ContentResult,
  Instance,
  InstanceAnalysis,
  InstanceSize,
  ReleaseInfo,
  ResourcePackReport,
  SaveTextResult,
  ScanProgress,
  ScreenshotReport,
  SettingValue,
  ShaderPackReport,
  SizeNode,
  StorageReport,
  TrashResult,
  UpdateInstallResult,
  UpdateProgress,
  UpdateStatus
} from '@shared/types'

const api = {
  scanInstances: (): Promise<Instance[]> => ipcRenderer.invoke('instances:scan'),

  addFolder: (title: string): Promise<Instance[]> =>
    ipcRenderer.invoke('instances:pickFolder', title),

  instanceSizes: (targets: Array<{ id: string; name: string; path: string }>): Promise<InstanceSize[]> =>
    ipcRenderer.invoke('instances:sizes', targets),

  listDirectory: (path: string): Promise<SizeNode[]> => ipcRenderer.invoke('fs:listDirectory', path),

  readConfigFile: (path: string): Promise<ConfigDocument> => ipcRenderer.invoke('config:read', path),

  writeConfigFile: (
    path: string,
    changes: Array<{ key: string; value: SettingValue }>
  ): Promise<ConfigWriteResult> => ipcRenderer.invoke('config:write', { path, changes }),

  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),

  setSettings: (patch: Partial<AppSettings>): Promise<AppSettings> =>
    ipcRenderer.invoke('settings:set', patch),

  analyseInstance: (gameDir: string, isServer: boolean): Promise<InstanceAnalysis> =>
    ipcRenderer.invoke('instance:analysis', { gameDir, isServer }),

  analyseStorage: (rootPath: string): Promise<StorageReport> =>
    ipcRenderer.invoke('instance:storage', rootPath),

  resourcePacks: (gameDir: string): Promise<ResourcePackReport> =>
    ipcRenderer.invoke('instance:resourcePacks', gameDir),

  shaderPacks: (gameDir: string): Promise<ShaderPackReport> =>
    ipcRenderer.invoke('instance:shaderPacks', gameDir),

  screenshots: (gameDir: string): Promise<ScreenshotReport> =>
    ipcRenderer.invoke('instance:screenshots', gameDir),

  thumbnails: (paths: string[]): Promise<Record<string, string>> =>
    ipcRenderer.invoke('instance:thumbnails', paths),

  setModEnabled: (path: string, enabled: boolean): Promise<ContentResult> =>
    ipcRenderer.invoke('mods:setEnabled', { path, enabled }),

  setPackEnabled: (gameDir: string, name: string, enabled: boolean): Promise<ContentResult> =>
    ipcRenderer.invoke('packs:setEnabled', { gameDir, name, enabled }),

  trash: (paths: string[], permanent: boolean): Promise<TrashResult[]> =>
    ipcRenderer.invoke('files:trash', { paths, permanent }),

  saveText: (request: {
    text: string
    fileName: string
    title: string
    filterName: string
  }): Promise<SaveTextResult> => ipcRenderer.invoke('files:saveText', request),

  openPath: (target: string): Promise<string> => ipcRenderer.invoke('shell:openPath', target),

  revealPath: (target: string): Promise<void> => ipcRenderer.invoke('shell:revealPath', target),

  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('shell:openExternal', url),

  appVersion: (): Promise<string> => ipcRenderer.invoke('app:version'),

  updateStatus: (force: boolean): Promise<UpdateStatus> => ipcRenderer.invoke('update:status', force),

  installUpdate: (): Promise<UpdateInstallResult> => ipcRenderer.invoke('update:install'),

  changelog: (version: string | null): Promise<ReleaseInfo | null> =>
    ipcRenderer.invoke('update:changelog', version),

  acknowledgeChangelog: (version: string): Promise<void> =>
    ipcRenderer.invoke('update:acknowledge', version),

  onProgress: (listener: (progress: ScanProgress) => void): (() => void) => {
    const handler = (_event: unknown, progress: ScanProgress): void => listener(progress)
    ipcRenderer.on('scan:progress', handler)
    return () => {
      ipcRenderer.removeListener('scan:progress', handler)
    }
  },

  onUpdateProgress: (listener: (progress: UpdateProgress) => void): (() => void) => {
    const handler = (_event: unknown, progress: UpdateProgress): void => listener(progress)
    ipcRenderer.on('update:progress', handler)
    return () => {
      ipcRenderer.removeListener('update:progress', handler)
    }
  }
}

export type ModpackUtilityApi = typeof api

contextBridge.exposeInMainWorld('api', api)
