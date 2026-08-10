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

export interface ModpackUtilityApi {
  scanInstances(): Promise<Instance[]>
  addFolder(title: string): Promise<Instance[]>
  instanceSizes(targets: Array<{ id: string; name: string; path: string }>): Promise<InstanceSize[]>
  listDirectory(path: string): Promise<SizeNode[]>
  readConfigFile(path: string): Promise<ConfigDocument>
  writeConfigFile(
    path: string,
    changes: Array<{ key: string; value: SettingValue }>
  ): Promise<ConfigWriteResult>
  getSettings(): Promise<AppSettings>
  setSettings(patch: Partial<AppSettings>): Promise<AppSettings>
  analyseInstance(gameDir: string, isServer: boolean): Promise<InstanceAnalysis>
  analyseStorage(rootPath: string): Promise<StorageReport>
  resourcePacks(gameDir: string): Promise<ResourcePackReport>
  shaderPacks(gameDir: string): Promise<ShaderPackReport>
  screenshots(gameDir: string): Promise<ScreenshotReport>
  thumbnails(paths: string[]): Promise<Record<string, string>>
  setModEnabled(path: string, enabled: boolean): Promise<ContentResult>
  setPackEnabled(gameDir: string, name: string, enabled: boolean): Promise<ContentResult>
  trash(paths: string[], permanent: boolean): Promise<TrashResult[]>
  saveText(request: {
    text: string
    fileName: string
    title: string
    filterName: string
  }): Promise<SaveTextResult>
  openPath(target: string): Promise<string>
  revealPath(target: string): Promise<void>
  openExternal(url: string): Promise<void>
  appVersion(): Promise<string>
  updateStatus(force: boolean): Promise<UpdateStatus>
  installUpdate(): Promise<UpdateInstallResult>
  changelog(version: string | null): Promise<ReleaseInfo | null>
  acknowledgeChangelog(version: string): Promise<void>
  onProgress(listener: (progress: ScanProgress) => void): () => void
  onUpdateProgress(listener: (progress: UpdateProgress) => void): () => void
}

declare global {
  interface Window {
    api: ModpackUtilityApi
  }
}
