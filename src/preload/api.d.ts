import type {
  AppSettings,
  ConfigDocument,
  ConfigWriteResult,
  ContentResult,
  Instance,
  InstanceAnalysis,
  InstanceSize,
  ResourcePackReport,
  ScanProgress,
  ScreenshotReport,
  SettingValue,
  SizeNode,
  StorageReport,
  TrashResult
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
  screenshots(gameDir: string): Promise<ScreenshotReport>
  thumbnails(paths: string[]): Promise<Record<string, string>>
  setModEnabled(path: string, enabled: boolean): Promise<ContentResult>
  setPackEnabled(gameDir: string, name: string, enabled: boolean): Promise<ContentResult>
  trash(paths: string[], permanent: boolean): Promise<TrashResult[]>
  openPath(target: string): Promise<string>
  revealPath(target: string): Promise<void>
  onProgress(listener: (progress: ScanProgress) => void): () => void
}

declare global {
  interface Window {
    api: ModpackUtilityApi
  }
}
