import { useMemo, type ReactNode } from 'react'
import { Box, Button, Divider, Stack, Typography } from '@mui/material'
import FolderOpenRounded from '@mui/icons-material/FolderOpenRounded'
import type { Instance, InstanceAnalysis, StorageReport } from '@shared/types'
import { buildInsights } from '../insights'
import { formatBytes, formatDate, formatMemory } from '../format'
import InsightCard from '../components/InsightCard'
import StatTile from '../components/StatTile'
import { useT } from '../i18n'

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
  const t = useT()
  const insights = useMemo(
    () => buildInsights(instance, analysis, storage, t),
    [instance, analysis, storage, t]
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
          label={t.overview.activeMods}
          value={analysis ? String(enabledMods) : '-'}
          hint={
            analysis && totalMods !== enabledMods
              ? t.overview.modsDisabled(totalMods - enabledMods)
              : undefined
          }
        />
        <StatTile
          label={t.overview.modsFolder}
          value={analysis ? formatBytes(analysis.mods.totalBytes, t) : '-'}
          hint={analysis?.mods.exists === false ? t.mods.noModsFolder : undefined}
        />
        <StatTile
          label={t.overview.configEntries}
          value={analysis ? String(analysis.configs.entries.length) : '-'}
          hint={orphanedConfigs > 0 ? t.overview.configsMatchNoMod(orphanedConfigs) : undefined}
        />
        <StatTile
          label={t.overview.instanceSize}
          value={storage ? formatBytes(storage.root.sizeBytes, t) : t.home.notMeasured}
          hint={storage ? t.home.files(storage.scannedFiles) : t.overview.openStorageTab}
        />
      </Box>

      {insights.length > 0 && (
        <Stack spacing={1.5}>
          <Typography variant="h6">{t.insights.heading}</Typography>
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
        <Typography variant="h6">{t.overview.details}</Typography>
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
          <DetailRow label={t.overview.launcher} value={t.launchers[instance.launcher]} />
          <DetailRow
            label={t.overview.minecraft}
            value={instance.minecraftVersion ?? t.common.unknown}
          />
          <DetailRow
            label={t.overview.modLoader}
            value={
              instance.loader && instance.loader !== 'unknown'
                ? `${t.loaders[instance.loader]}${instance.loaderVersion ? ` ${instance.loaderVersion}` : ''}`
                : t.common.unknown
            }
          />
          <DetailRow
            label={t.overview.memory}
            value={
              instance.memory
                ? instance.memory.minMb
                  ? t.overview.memoryWithMinimum(
                      formatMemory(instance.memory.maxMb, t),
                      formatMemory(instance.memory.minMb, t)
                    )
                  : formatMemory(instance.memory.maxMb, t)
                : t.common.launcherDefault
            }
          />
          <DetailRow
            label={t.overview.javaArguments}
            value={instance.javaArgs ?? t.common.noneSet}
            mono
          />
          <DetailRow label={t.overview.lastPlayed} value={formatDate(instance.lastPlayedIso, t)} />
          <DetailRow
            label={t.overview.instanceFolder}
            value={instance.rootPath}
            mono
            action={
              <Button
                size="small"
                startIcon={<FolderOpenRounded />}
                onClick={() => onReveal(instance.rootPath)}
              >
                {t.common.open}
              </Button>
            }
          />
          {instance.gameDir !== instance.rootPath && (
            <DetailRow label={t.overview.gameFolder} value={instance.gameDir} mono last />
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
