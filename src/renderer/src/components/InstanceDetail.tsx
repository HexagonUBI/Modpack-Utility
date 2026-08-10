import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  LinearProgress,
  Stack,
  Tab,
  Tabs,
  Typography
} from '@mui/material'
import IosShareRounded from '@mui/icons-material/IosShareRounded'
import type {
  Instance,
  InstanceAnalysis,
  ResourcePackReport,
  ScreenshotReport,
  ShaderPackReport,
  StorageReport
} from '@shared/types'
import type { ThemeMode } from '../theme'
import ExportDialog from './ExportDialog'
import OverviewTab from '../tabs/OverviewTab'
import ModsTab from '../tabs/ModsTab'
import DependenciesTab from '../tabs/DependenciesTab'
import ConfigsTab from '../tabs/ConfigsTab'
import StorageTab from '../tabs/StorageTab'
import ResourcePacksTab from '../tabs/ResourcePacksTab'
import ScreenshotsTab from '../tabs/ScreenshotsTab'
import { useT, type Messages } from '../i18n'

type TabKey = 'overview' | 'mods' | 'dependencies' | 'configs' | 'storage' | 'packs' | 'screenshots'

interface InstanceContent {
  packs: ResourcePackReport
  shaders: ShaderPackReport
  screenshots: ScreenshotReport
}

interface InstanceDetailProps {
  instance: Instance
  analysis: InstanceAnalysis | null
  analysisLoading: boolean
  analysisError: string | null
  content: InstanceContent | null
  storage: StorageReport | null
  storageLoading: boolean
  progress: string | null
  mode: ThemeMode
  busy: boolean
  onScanStorage: () => void
  onReveal: (path: string) => void
  onOpen: (path: string) => void
  onPurge: (paths: string[], permanent: boolean) => void
  onConfigSaved: (message: string) => void
  onToggleMod: (path: string, enabled: boolean) => void
  onTogglePack: (name: string, enabled: boolean) => void
  onNotify: (pick: (t: Messages) => string) => void
}

export default function InstanceDetail({
  instance,
  analysis,
  analysisLoading,
  analysisError,
  content,
  storage,
  storageLoading,
  progress,
  mode,
  busy,
  onScanStorage,
  onReveal,
  onOpen,
  onPurge,
  onConfigSaved,
  onToggleMod,
  onTogglePack,
  onNotify
}: InstanceDetailProps) {
  const t = useT()
  const [tab, setTab] = useState<TabKey>('overview')
  const [exporting, setExporting] = useState(false)

  const [revealMod, setRevealMod] = useState<string | null>(null)

  const showMod = (filePath: string): void => {
    setTab('mods')
    setRevealMod(filePath)
  }

  useEffect(() => setTab('overview'), [instance.id])

  return (
    <Stack sx={{ height: '100%', minWidth: 0 }}>
      <Box sx={{ px: 3, pt: 2.5, pb: 0 }}>
        <Stack direction="row" spacing={1.5} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="h5" sx={{ mr: 0.5 }}>
            {instance.name}
          </Typography>
          <Chip size="small" label={t.launchers[instance.launcher]} />
          {instance.minecraftVersion && (
            <Chip size="small" variant="outlined" label={instance.minecraftVersion} />
          )}
          {instance.isServer && <Chip size="small" variant="outlined" label={t.common.server} />}
          <Box sx={{ flex: 1 }} />
          <Button
            size="small"
            startIcon={<IosShareRounded />}
            onClick={() => setExporting(true)}
            disabled={analysis === null}
          >
            {t.export.button}
          </Button>
        </Stack>

        <Tabs
          value={tab}
          onChange={(_event, next: TabKey) => setTab(next)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mt: 1.5 }}
        >
          <Tab value="overview" label={t.tabs.overview} />
          <Tab value="mods" label={withCount(t.tabs.mods, analysis?.mods.mods.length)} />
          <Tab value="dependencies" label={t.tabs.dependencies} />
          <Tab value="configs" label={withCount(t.tabs.configs, analysis?.configs.entries.length)} />
          <Tab value="storage" label={t.tabs.storage} />
          <Tab value="packs" label={withCount(t.tabs.resourcePacks, content?.packs.packs.length)} />
          <Tab
            value="screenshots"
            label={withCount(t.tabs.screenshots, content?.screenshots.screenshots.length)}
          />
        </Tabs>
      </Box>

      <Divider />
      {(analysisLoading || busy) && <LinearProgress />}

      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
        {analysisError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {t.notices.analysisFailed(analysisError)}
          </Alert>
        )}

        {tab === 'overview' && (
          <OverviewTab
            instance={instance}
            analysis={analysis}
            storage={storage}
            onReveal={onReveal}
            onShowMod={showMod}
          />
        )}

        {tab === 'mods' &&
          (analysis ? (
            <ModsTab
              report={analysis.mods}
              busy={busy}
              revealPath={revealMod}
              onRevealHandled={() => setRevealMod(null)}
              onReveal={onReveal}
              onToggleEnabled={onToggleMod}
            />
          ) : (
            <Loading label={t.loading.mods} />
          ))}

        {tab === 'dependencies' &&
          (analysis ? (
            <DependenciesTab report={analysis.mods} onShowMod={showMod} />
          ) : (
            <Loading label={t.loading.dependencies} />
          ))}

        {tab === 'configs' &&
          (analysis ? (
            <ConfigsTab
              report={analysis.configs}
              busy={busy}
              onReveal={onReveal}
              onOpen={onOpen}
              onPurge={onPurge}
              onConfigSaved={onConfigSaved}
            />
          ) : (
            <Loading label={t.loading.configs} />
          ))}

        {tab === 'storage' && (
          <StorageTab
            report={storage}
            rootLabel={instance.name}
            loading={storageLoading}
            busy={busy}
            progress={progress}
            mode={mode}
            onScan={onScanStorage}
            onReveal={onReveal}
            onPurge={onPurge}
          />
        )}

        {tab === 'packs' &&
          (content ? (
            <ResourcePacksTab
              report={content.packs}
              busy={busy}
              onReveal={onReveal}
              onPurge={onPurge}
              onToggleEnabled={onTogglePack}
            />
          ) : (
            <Loading label={t.loading.packs} />
          ))}

        {tab === 'screenshots' &&
          (content ? (
            <ScreenshotsTab
              report={content.screenshots}
              busy={busy}
              onOpen={onOpen}
              onReveal={onReveal}
              onPurge={onPurge}
            />
          ) : (
            <Loading label={t.loading.screenshots} />
          ))}
      </Box>

      <ExportDialog
        open={exporting}
        instance={instance}
        mods={analysis?.mods ?? null}
        packs={content?.packs ?? null}
        shaders={content?.shaders ?? null}
        onClose={() => setExporting(false)}
        onDone={onNotify}
      />
    </Stack>
  )
}

function Loading({ label }: { label: string }) {
  return (
    <Stack spacing={2} sx={{ alignItems: 'center', py: 10 }}>
      <CircularProgress />
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
    </Stack>
  )
}

function withCount(name: string, count: number | undefined): string {
  return count === undefined ? name : `${name} ${count}`
}
