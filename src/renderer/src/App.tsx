import { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, CssBaseline, Snackbar, ThemeProvider } from '@mui/material'
import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type ContentResult,
  type Instance,
  type InstanceAnalysis,
  type InstanceSize,
  type ResourcePackReport,
  type ScanProgress,
  type ScreenshotReport,
  type StorageReport
} from '@shared/types'
import { buildTheme, type ThemeMode } from './theme'
import { I18nContext, messagesFor, type Messages } from './i18n'
import { formatCount } from './format'
import { useAsyncData } from './hooks'
import InstanceSidebar from './components/InstanceSidebar'
import InstanceDetail from './components/InstanceDetail'
import HomePage from './pages/HomePage'
import SettingsPage from './pages/SettingsPage'

type View = 'home' | 'instance' | 'settings'

interface InstanceContent {
  packs: ResourcePackReport
  screenshots: ScreenshotReport
}

interface RequestKey {
  gameDir: string
  isServer: boolean
  token: number
}

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [systemMode, setSystemMode] = useState<ThemeMode>(() =>
    window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  )

  const mode: ThemeMode = settings.theme === 'system' ? systemMode : settings.theme
  const theme = useMemo(() => buildTheme(mode, settings.accent), [mode, settings.accent])
  const messages = useMemo(() => messagesFor(settings.language), [settings.language])

  const [view, setView] = useState<View>('home')
  const [instances, setInstances] = useState<Instance[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<ScanProgress | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)

  const [instanceSizes, setInstanceSizes] = useState<InstanceSize[] | null>(null)
  const [measuringAll, setMeasuringAll] = useState(false)
  const [measureFraction, setMeasureFraction] = useState(0)

  const [storageById, setStorageById] = useState<Record<string, StorageReport>>({})
  const [storageLoadingId, setStorageLoadingId] = useState<string | null>(null)

  const selected = instances.find((instance) => instance.id === selectedId) ?? null

  const requestKey =
    selected && view === 'instance'
      ? JSON.stringify({
          gameDir: selected.gameDir,
          isServer: selected.isServer,
          token: refreshToken
        } satisfies RequestKey)
      : null

  const loadAnalysis = useCallback((raw: string): Promise<InstanceAnalysis> => {
    const { gameDir, isServer } = JSON.parse(raw) as RequestKey
    return window.api.analyseInstance(gameDir, isServer)
  }, [])

  const loadContent = useCallback(async (raw: string): Promise<InstanceContent> => {
    const { gameDir } = JSON.parse(raw) as RequestKey
    const [packs, screenshots] = await Promise.all([
      window.api.resourcePacks(gameDir),
      window.api.screenshots(gameDir)
    ])
    return { packs, screenshots }
  }, [])

  const analysis = useAsyncData(requestKey, loadAnalysis)
  const content = useAsyncData(requestKey, loadContent)

  const progressText = useMemo(
    () => (progress === null ? null : describeProgress(progress, messages)),
    [progress, messages]
  )

  useEffect(
    () =>
      window.api.onProgress((update) => {
        setProgress(update)
        if (update.total > 0) setMeasureFraction(update.current / update.total)
      }),
    []
  )

  useEffect(() => {
    void window.api.getSettings().then(setSettings)
  }, [])

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-color-scheme: light)')
    if (!query) return
    const handler = (event: MediaQueryListEvent): void => setSystemMode(event.matches ? 'light' : 'dark')
    query.addEventListener('change', handler)
    return () => query.removeEventListener('change', handler)
  }, [])

  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    setSettings((current) => ({ ...current, ...patch }))
    const saved = await window.api.setSettings(patch)
    setSettings(saved)
    return saved
  }, [])

  const rescan = useCallback(async () => {
    setScanning(true)
    try {
      const found = await window.api.scanInstances()
      setInstances(found)
      setInstanceSizes(null)
      setSelectedId((current) =>
        current && found.some((instance) => instance.id === current) ? current : null
      )
      if (found.length === 0) setNotice(messages.nav.noInstances)
    } catch {
      setNotice(messages.notices.scanFailed)
    } finally {
      setScanning(false)
      setProgress(null)
    }
  }, [messages])

  useEffect(() => {
    void rescan()
  }, [rescan])

  const addFolder = useCallback(async () => {
    try {
      const added = await window.api.addFolder(messages.nav.pickFolderTitle)
      if (added.length === 0) return

      setInstances((current) => {
        const byPath = new Map(current.map((instance) => [instance.rootPath.toLowerCase(), instance]))
        for (const instance of added) byPath.set(instance.rootPath.toLowerCase(), instance)
        return [...byPath.values()].sort((a, b) => a.name.localeCompare(b.name))
      })
      setInstanceSizes(null)
      setSettings(await window.api.getSettings())
      setNotice(messages.notices.instancesAdded(added.length))
    } catch {
      setNotice(messages.notices.folderFailed)
    }
  }, [messages])

  const measureAll = useCallback(async () => {
    setMeasuringAll(true)
    setMeasureFraction(0)
    try {
      const sizes = await window.api.instanceSizes(
        instances.map((instance) => ({
          id: instance.id,
          name: instance.name,
          path: instance.rootPath
        }))
      )
      setInstanceSizes(sizes)
    } catch {
      setNotice(messages.notices.measureAllFailed)
    } finally {
      setMeasuringAll(false)
      setProgress(null)
    }
  }, [instances, messages])

  const scanStorage = useCallback(async () => {
    if (!selected) return
    const target = selected

    setStorageLoadingId(target.id)
    try {
      const report = await window.api.analyseStorage(target.gameDir)
      setStorageById((current) => ({ ...current, [target.id]: report }))
    } catch {
      setNotice(messages.notices.measureFailed)
    } finally {
      setStorageLoadingId(null)
      setProgress(null)
    }
  }, [selected, messages])

  const purge = useCallback(
    async (paths: string[]) => {
      if (paths.length === 0) return
      const target = selected

      setBusy(true)
      try {
        const results = await window.api.trash(paths)
        const failed = results.filter((result) => !result.ok)
        const moved = results.length - failed.length

        setNotice(
          failed.length === 0
            ? messages.notices.movedToBin(moved)
            : messages.notices.movedPartly(moved, failed.length, failed[0]?.error ?? null)
        )

        if (target) {
          setStorageById((current) => {
            const next = { ...current }
            delete next[target.id]
            return next
          })
        }
        setInstanceSizes(null)
        setRefreshToken((token) => token + 1)
      } catch {
        setNotice(messages.notices.purgeFailed)
      } finally {
        setBusy(false)
      }
    },
    [selected, messages]
  )

  const runMutation = useCallback(
    async (action: () => Promise<ContentResult>, failure: string) => {
      setBusy(true)
      try {
        const result = await action()
        if (!result.ok) setNotice(describeContentError(result, messages, failure))
        setRefreshToken((token) => token + 1)
      } catch {
        setNotice(failure)
      } finally {
        setBusy(false)
      }
    },
    [messages]
  )

  const toggleMod = useCallback(
    (path: string, enabled: boolean) => {
      void runMutation(
        () => window.api.setModEnabled(path, enabled),
        messages.notices.modToggleFailed
      )
    },
    [runMutation, messages]
  )

  const togglePack = useCallback(
    (name: string, enabled: boolean) => {
      if (!selected) return
      const gameDir = selected.gameDir
      void runMutation(
        () => window.api.setPackEnabled(gameDir, name, enabled),
        messages.notices.packToggleFailed
      )
    },
    [runMutation, selected, messages]
  )

  const reveal = useCallback((path: string) => {
    void window.api.revealPath(path)
  }, [])

  const open = useCallback((path: string) => {
    void window.api.openPath(path)
  }, [])

  const selectInstance = useCallback((instance: Instance) => {
    setSelectedId(instance.id)
    setView('instance')
  }, [])

  return (
    <I18nContext.Provider value={messages}>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: '100vh', backgroundColor: 'background.default' }}>
        <InstanceSidebar
          instances={instances}
          selectedId={view === 'instance' ? selectedId : null}
          view={view}
          scanning={scanning}
          mode={mode}
          onSelect={selectInstance}
          onHome={() => setView('home')}
          onSettings={() => setView('settings')}
          onRescan={() => void rescan()}
          onAddFolder={() => void addFolder()}
          onToggleMode={() =>
            void updateSettings({ theme: mode === 'dark' ? 'light' : 'dark' })
          }
          measureProgress={measuringAll ? measureFraction : null}
        />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          {view === 'settings' && (
            <SettingsPage
              settings={settings}
              mode={mode}
              onChange={(patch) => void updateSettings(patch)}
              onAddFolder={() => void addFolder()}
              onReveal={reveal}
            />
          )}

          {view === 'home' && (
            <HomePage
              instances={instances}
              sizes={instanceSizes}
              measuring={measuringAll}
              progress={progressText}
              mode={mode}
              onMeasure={() => void measureAll()}
              onSelect={selectInstance}
            />
          )}

          {view === 'instance' && selected && (
            <InstanceDetail
              instance={selected}
              analysis={analysis.status === 'ready' ? analysis.data : null}
              analysisLoading={analysis.status === 'loading'}
              analysisError={analysis.status === 'error' ? analysis.error : null}
              content={content.status === 'ready' ? content.data : null}
              storage={storageById[selected.id] ?? null}
              storageLoading={storageLoadingId === selected.id}
              progress={progressText}
              mode={mode}
              busy={busy}
              onScanStorage={() => void scanStorage()}
              onReveal={reveal}
              onOpen={open}
              onPurge={(paths) => void purge(paths)}
              onConfigSaved={(message) => {
                setNotice(message)

                setRefreshToken((token) => token + 1)
              }}
              onToggleMod={toggleMod}
              onTogglePack={togglePack}
            />
          )}
        </Box>
      </Box>

      <Snackbar
        open={notice !== null}
        autoHideDuration={6000}
        onClose={() => setNotice(null)}
        message={notice ?? ''}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </ThemeProvider>
    </I18nContext.Provider>
  )
}

function describeProgress(progress: ScanProgress, t: Messages): string {
  switch (progress.phase) {
    case 'launchers':
      return t.progress.checkingLauncher(t.launchers[progress.launcher])
    case 'instances':
      return t.progress.measuringInstance(progress.name, progress.current, progress.total)
    case 'files':
      return t.progress.walkingFiles(progress.relativePath, formatCount(progress.current))
  }
}

function describeContentError(result: ContentResult, t: Messages, fallback: string): string {
  switch (result.error) {
    case 'modFileExists':
      return t.notices.modFileExists(result.detail ?? '')
    case 'noOptionsFile':
      return t.notices.noOptionsFile
    default:
      return fallback
  }
}
