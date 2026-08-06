import { useMemo, type ReactNode } from 'react'
import { Box, Button, Divider, Stack, Typography } from '@mui/material'
import FolderOpenRounded from '@mui/icons-material/FolderOpenRounded'
import { LAUNCHER_LABELS, type Instance, type InstanceAnalysis, type StorageReport } from '@shared/types'
import { buildInsights } from '../insights'
import { formatBytes, formatDate, formatMemory } from '../format'
import InsightCard from '../components/InsightCard'
import StatTile from '../components/StatTile'

interface OverviewTabProps {
  instance: Instance
  analysis: InstanceAnalysis | null
  storage: StorageReport | null
  onReveal: (path: string) => void
  onShowMod: (filePath: string) => void
}

export default function OverviewTab({
  instance,
  analysis,
  storage,
  onReveal,
  onShowMod
}: OverviewTabProps) {
  const insights = useMemo(
    () => buildInsights(instance, analysis, storage),
    [instance, analysis, storage]
  )

  const enabledMods = analysis?.mods.mods.filter((mod) => mod.enabled).length ?? 0
  const totalMods = analysis?.mods.mods.length ?? 0
  const orphanedConfigs = analysis?.configs.totals.orphaned ?? 0

  return (
    <Stack spacing={3}>
      <Box
        sx={{
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))'
        }}
      >
        <StatTile
          label="Active mods"
          value={analysis ? String(enabledMods) : '-'}
          hint={analysis && totalMods !== enabledMods ? `${totalMods - enabledMods} disabled` : undefined}
        />
        <StatTile
          label="Mods folder"
          value={analysis ? formatBytes(analysis.mods.totalBytes) : '-'}
          hint={analysis?.mods.exists === false ? 'No mods folder' : undefined}
        />
        <StatTile
          label="Config entries"
          value={analysis ? String(analysis.configs.entries.length) : '-'}
          hint={orphanedConfigs > 0 ? `${orphanedConfigs} match no mod` : undefined}
        />
        <StatTile
          label="Instance size"
          value={storage ? formatBytes(storage.root.sizeBytes) : 'Not measured'}
          hint={storage ? `${storage.scannedFiles.toLocaleString()} files` : 'Open the Storage tab'}
        />
      </Box>

      {insights.length > 0 && (
        <Stack spacing={1.5}>
          <Typography variant="h6">Health &amp; performance</Typography>
          {insights.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onOpen={
                insight.focusModPath ? () => onShowMod(insight.focusModPath!) : undefined
              }
            />
          ))}
        </Stack>
      )}

      <Stack spacing={1.5}>
        <Typography variant="h6">Details</Typography>
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
          <DetailRow label="Launcher" value={LAUNCHER_LABELS[instance.launcher]} />
          <DetailRow label="Minecraft" value={instance.minecraftVersion ?? 'Unknown'} />
          <DetailRow
            label="Mod loader"
            value={
              instance.loader && instance.loader !== 'unknown'
                ? `${loaderName(instance.loader)}${instance.loaderVersion ? ` ${instance.loaderVersion}` : ''}`
                : 'Unknown'
            }
          />
          <DetailRow
            label="Memory"
            value={
              instance.memory
                ? `${formatMemory(instance.memory.maxMb)}${
                    instance.memory.minMb ? ` (min ${formatMemory(instance.memory.minMb)})` : ''
                  }`
                : 'Launcher default'
            }
          />
          <DetailRow label="Java arguments" value={instance.javaArgs ?? 'None set'} mono />
          <DetailRow label="Last played" value={formatDate(instance.lastPlayedIso)} />
          <DetailRow
            label="Instance folder"
            value={instance.rootPath}
            mono
            action={
              <Button
                size="small"
                startIcon={<FolderOpenRounded />}
                onClick={() => onReveal(instance.rootPath)}
              >
                Open
              </Button>
            }
          />
          {instance.gameDir !== instance.rootPath && (
            <DetailRow label="Game folder" value={instance.gameDir} mono last />
          )}
        </Box>
      </Stack>
    </Stack>
  )
}

interface DetailRowProps {
  label: string
  value: string
  mono?: boolean
  last?: boolean
  action?: ReactNode
}

function DetailRow({ label, value, mono, last, action }: DetailRowProps) {
  return (
    <>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '180px 1fr auto' },
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 1.25
        }}
      >
        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
          {label}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontFamily: mono ? 'ui-monospace, "Cascadia Mono", Consolas, monospace' : undefined,
            fontSize: mono ? 12.5 : undefined,
            wordBreak: 'break-word'
          }}
        >
          {value}
        </Typography>
        {action}
      </Box>
      {!last && <Divider />}
    </>
  )
}

function loaderName(loader: string): string {
  switch (loader) {
    case 'neoforge':
      return 'NeoForge'
    case 'forge':
      return 'Forge'
    case 'fabric':
      return 'Fabric'
    case 'quilt':
      return 'Quilt'
    case 'vanilla':
      return 'Vanilla'
    default:
      return loader
  }
}
