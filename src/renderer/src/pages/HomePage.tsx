import { useMemo } from 'react'
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material'
import StorageRounded from '@mui/icons-material/StorageRounded'
import { LAUNCHER_LABELS, type Instance, type InstanceSize, type LauncherKind } from '@shared/types'
import { formatBytes, formatDate, formatPercent } from '../format'
import { categoricalColour, CATEGORICAL_SLOT_COUNT } from '../viz'
import type { ThemeMode } from '../theme'
import Donut, { type DonutSlice } from '../components/Donut'
import BarList from '../components/BarList'
import StatTile from '../components/StatTile'
import { useT } from '../i18n'

interface HomePageProps {
  instances: Instance[]
  sizes: InstanceSize[] | null
  measuring: boolean
  progress: string | null
  mode: ThemeMode
  onMeasure: () => void
  onSelect: (instance: Instance) => void
}

export default function HomePage({
  instances,
  sizes,
  measuring,
  progress,
  mode,
  onMeasure,
  onSelect
}: HomePageProps) {
  const t = useT()
  const byLauncher = useMemo(() => countBy(instances, (instance) => instance.launcher), [instances])

  const versions = useMemo(
    () => new Set(instances.map((instance) => instance.minecraftVersion).filter(Boolean)).size,
    [instances]
  )

  const recent = useMemo(
    () =>
      instances
        .filter((instance) => instance.lastPlayedIso !== null)
        .sort((a, b) => (b.lastPlayedIso ?? '').localeCompare(a.lastPlayedIso ?? ''))
        .slice(0, 5),
    [instances]
  )

  const ranked = useMemo(() => rankBySize(instances, sizes), [instances, sizes])
  const totalBytes = ranked.reduce((sum, entry) => sum + entry.sizeBytes, 0)

  const slices = useMemo<DonutSlice[]>(() => {
    if (ranked.length === 0) return []

    const leading = ranked.slice(0, CATEGORICAL_SLOT_COUNT)
    const rest = ranked.slice(CATEGORICAL_SLOT_COUNT)

    const result: DonutSlice[] = leading.map((entry, index) => ({
      key: entry.instance.id,
      label: entry.instance.name,
      value: entry.sizeBytes,
      colour: categoricalColour(index, mode),
      detail: formatBytes(entry.sizeBytes)
    }))

    if (rest.length > 0) {
      const restBytes = rest.reduce((sum, entry) => sum + entry.sizeBytes, 0)
      result.push({
        key: 'other',
        label: t.home.smallerInstances(rest.length),
        value: restBytes,
        colour: categoricalColour(CATEGORICAL_SLOT_COUNT, mode),
        detail: formatBytes(restBytes)
      })
    }

    return result
  }, [ranked, mode])

  return (
    <Box sx={{ height: '100%', overflowY: 'auto', px: 4, py: 3 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h5">{t.home.title}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t.home.subtitle(instances.length, byLauncher.length)}
          </Typography>
        </Box>

        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
          <StatTile label={t.home.instances} value={String(instances.length)} hint={t.home.instancesHint} />
          <StatTile
            label={t.home.launchers}
            value={String(byLauncher.length)}
            hint={t.home.launchersHint}
          />
          <StatTile label={t.home.versions} value={String(versions)} hint={t.home.versionsHint} />
          <StatTile
            label={t.home.totalOnDisk}
            value={sizes ? formatBytes(totalBytes) : t.home.notMeasured}
            hint={sizes ? t.home.files(sumFiles(sizes)) : t.home.measureToFillIn}
          />
        </Box>

        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            p: 2.5
          }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ flex: 1 }}>
              {t.home.whereSpaceGoes}
            </Typography>
            {sizes && (
              <Button size="small" onClick={onMeasure} disabled={measuring}>
                {t.home.reMeasure}
              </Button>
            )}
          </Stack>

          {measuring ? (
            <Stack spacing={2} sx={{ alignItems: 'center', py: 6 }}>
              <CircularProgress />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {progress ?? t.home.measuring}
              </Typography>
            </Stack>
          ) : !sizes ? (
            <Stack spacing={2} sx={{ alignItems: 'center', py: 5, textAlign: 'center' }}>
              <StorageRounded sx={{ fontSize: 38, color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 460 }}>
                {t.home.measureBlurb}
              </Typography>
              <Button variant="contained" onClick={onMeasure}>
                {t.home.measureAll}
              </Button>
            </Stack>
          ) : (
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={4}
              sx={{ alignItems: { md: 'center' } }}
            >
              <Box sx={{ flexShrink: 0, alignSelf: 'center' }}>
                <Donut
                  slices={slices}
                  size={240}
                  centreValue={formatBytes(totalBytes)}
                  centreLabel={t.home.acrossAllInstances}
                  onSelect={(slice) => {
                    const match = instances.find((instance) => instance.id === slice.key)
                    if (match) onSelect(match)
                  }}
                />
              </Box>

              <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
                {slices.map((slice) => (
                  <Stack
                    key={slice.key}
                    direction="row"
                    spacing={1.25}
                    sx={{
                      alignItems: 'center',
                      cursor: slice.key === 'other' ? 'default' : 'pointer',
                      py: 0.25
                    }}
                    onClick={() => {
                      const match = instances.find((instance) => instance.id === slice.key)
                      if (match) onSelect(match)
                    }}
                  >
                    <Box
                      sx={{
                        width: 11,
                        height: 11,
                        borderRadius: '3px',
                        backgroundColor: slice.colour,
                        flexShrink: 0
                      }}
                    />
                    <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>
                      {slice.label}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}
                    >
                      {formatBytes(slice.value)}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                        fontVariantNumeric: 'tabular-nums',
                        width: 44,
                        textAlign: 'right'
                      }}
                    >
                      {formatPercent(slice.value, totalBytes)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Stack>
          )}
        </Box>

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2.5 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {t.home.byLauncher}
            </Typography>
            <BarList
              data={byLauncher.map(([launcher, count], index) => ({
                key: launcher,
                label: LAUNCHER_LABELS[launcher],
                value: count,
                colour: categoricalColour(index, mode)
              }))}
              unit={t.home.instancesUnit}
            />
          </Box>

          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2.5 }}>
            <Typography variant="h6" sx={{ mb: 1.5 }}>
              {t.home.recentlyPlayed}
            </Typography>
            {recent.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t.home.noRecent}
              </Typography>
            ) : (
              <Stack spacing={0.75}>
                {recent.map((instance) => (
                  <Stack
                    key={instance.id}
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => onSelect(instance)}
                  >
                    <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>
                      {instance.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {formatDate(instance.lastPlayedIso)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            )}
          </Box>
        </Box>
      </Stack>
    </Box>
  )
}

interface RankedInstance {
  instance: Instance
  sizeBytes: number
}

function rankBySize(instances: Instance[], sizes: InstanceSize[] | null): RankedInstance[] {
  if (!sizes) return []
  const byId = new Map(sizes.map((entry) => [entry.id, entry]))

  return instances
    .map((instance) => ({ instance, sizeBytes: byId.get(instance.id)?.sizeBytes ?? 0 }))
    .filter((entry) => entry.sizeBytes > 0)
    .sort((a, b) => b.sizeBytes - a.sizeBytes)
}

function sumFiles(sizes: InstanceSize[]): number {
  return sizes.reduce((sum, entry) => sum + entry.fileCount, 0)
}

function countBy(instances: Instance[], key: (instance: Instance) => LauncherKind): Array<[LauncherKind, number]> {
  const counts = new Map<LauncherKind, number>()
  for (const instance of instances) {
    const value = key(instance)
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])
}
