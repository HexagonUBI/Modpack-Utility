import { useEffect, useMemo, useState } from 'react'
import {
  Autocomplete,
  Box,
  Chip,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import type { ModFile, ModsReport } from '@shared/types'
import { isImplicitModId } from '@shared/modIds'
import DependencyGraph, { LINK_STATES, linkStateLabel, type LinkState } from '../components/DependencyGraph'
import DependencyMap from '../components/DependencyMap'

const MAP_HEIGHT = 620
import EmptyState from '../components/EmptyState'
import { useElementSize } from '../hooks'
import { useT } from '../i18n'

interface DependenciesTabProps {
  report: ModsReport
  onShowMod: (filePath: string) => void
}

export default function DependenciesTab({ report, onShowMod }: DependenciesTabProps) {
  const t = useT()
  const theme = useTheme()
  const [focus, setFocus] = useState<ModFile | null>(null)
  const [includeAbsentOptional, setIncludeAbsentOptional] = useState(false)
  const [layout, setLayout] = useState<'map' | 'focus'>('map')
  const [containerRef, size] = useElementSize<HTMLDivElement>()

  const installedIds = useMemo(() => {
    const ids = new Set<string>()
    for (const mod of report.mods) {
      if (mod.modId) ids.add(mod.modId.toLowerCase())
      for (const provided of mod.provides) ids.add(provided.toLowerCase())
    }
    return ids
  }, [report.mods])

  const hiddenOptional = useMemo(() => {
    if (!focus) return 0
    return focus.dependencies.filter(
      (dependency) =>
        dependency.kind === 'optional' &&
        !isImplicitModId(dependency.modId) &&
        !installedIds.has(dependency.modId.toLowerCase())
    ).length
  }, [focus, installedIds])

  const withRequirements = useMemo(
    () =>
      report.mods.filter((mod) =>
        mod.dependencies.some((dependency) => dependency.kind === 'required' && !isImplicitModId(dependency.modId))
      ),
    [report.mods]
  )

  useEffect(() => {
    if (layout === 'map') return
    if (focus && report.mods.includes(focus)) return

    const broken = report.mods.find((mod) =>
      report.missingDependencies.some((missing) => missing.requiredBy.includes(mod.name ?? mod.fileName))
    )
    const mostConnected = [...withRequirements].sort(
      (a, b) => b.dependencies.length - a.dependencies.length
    )[0]

    setFocus(broken ?? mostConnected ?? report.mods[0] ?? null)
  }, [layout, report, withRequirements, focus])

  if (report.mods.length === 0) {
    return <EmptyState title={t.dependencies.noMods} detail={t.dependencies.noModsDetail} />
  }

  const stateColours: Record<LinkState, string> = {
    satisfied: theme.palette.text.secondary,
    missing: theme.palette.error.main,
    disabled: theme.palette.warning.main,
    optional: theme.palette.divider
  }

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
        <SummaryTile
          label={t.dependencies.withRequirements}
          value={String(withRequirements.length)}
          detail={t.dependencies.ofInstalled(report.mods.length)}
        />
        <SummaryTile
          label={t.dependencies.unmet}
          value={String(report.missingDependencies.length)}
          detail={
            report.missingDependencies.length === 0
              ? t.dependencies.nothingMissing
              : t.dependencies.listedBelow
          }
        />
        <SummaryTile
          label={t.dependencies.conflicts}
          value={String(report.conflicts.length)}
          detail={
            report.conflicts.length === 0
              ? t.dependencies.noneDeclared
              : t.dependencies.excludeEachOther
          }
        />
      </Box>

      <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={layout}
          onChange={(_event, next: 'map' | 'focus' | null) => next && setLayout(next)}
        >
          <ToggleButton value="map">{t.dependencies.wholeInstance}</ToggleButton>
          <ToggleButton value="focus">{t.dependencies.oneMod}</ToggleButton>
        </ToggleButtonGroup>

        <Autocomplete
          size="small"
          options={report.mods}
          value={focus}
          onChange={(_event, next) => setFocus(next)}
          getOptionLabel={(mod) => mod.name ?? mod.fileName}
          isOptionEqualToValue={(a, b) => a.filePath === b.filePath}
          renderInput={(params) => (
            <TextField
              {...params}
              label={layout === 'map' ? t.dependencies.highlight : t.dependencies.showDependenciesFor}
            />
          )}
          sx={{ flex: 1, minWidth: 280, maxWidth: 460 }}
        />
      </Stack>

      <Stack
        direction="row"
        spacing={2}
        useFlexGap
        sx={{ flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {LINK_STATES.map((state) => (
          <Stack key={state} direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                width: 18,
                height: 0,
                borderTop: `2px ${state === 'optional' ? 'dashed' : 'solid'} ${stateColours[state]}`
              }}
            />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {linkStateLabel(state, t)}
              </Typography>
            </Stack>
          ))}
        </Stack>

        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={includeAbsentOptional}
              onChange={(event) => setIncludeAbsentOptional(event.target.checked)}
            />
          }
          label={
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {layout === 'map'
                ? t.dependencies.includeOptionalLinks
                : t.dependencies.showAbsentOptional(
                    includeAbsentOptional ? 0 : hiddenOptional
                  )}
            </Typography>
          }
        />
      </Stack>

      <Box
        ref={containerRef}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 0,
          overflowX: layout === 'map' ? 'hidden' : 'auto',
          overflowY: 'hidden',
          p: layout === 'map' ? 0 : 1
        }}
      >
        {size.width > 0 && layout === 'map' && (
          <DependencyMap
            mods={report.mods}
            includeOptional={includeAbsentOptional}
            width={size.width}
            height={MAP_HEIGHT}
            selectedPath={focus?.filePath ?? null}
            onSelect={setFocus}
            onClearSelection={() => setFocus(null)}
          />
        )}

        {size.width > 0 && layout === 'focus' && focus && (
          <DependencyGraph
            focus={focus}
            mods={report.mods}
            width={size.width - 16}
            includeAbsentOptional={includeAbsentOptional}
            onSelect={setFocus}
          />
        )}
      </Box>

      {report.conflicts.length > 0 && (
        <Stack spacing={1}>
          <Typography variant="subtitle2">{t.dependencies.declaredConflicts}</Typography>
          {report.conflicts.map((conflict) => (
            <Typography
              key={`${conflict.declaredBy}-${conflict.modId}`}
              variant="body2"
              sx={{ color: 'text.secondary' }}
            >
              {t.dependencies.conflictSentence(
                conflict.declaredBy,
                conflict.modId,
                conflict.versionRange,
                conflict.installedVersion
              )}
            </Typography>
          ))}
        </Stack>
      )}

      {report.missingDependencies.length > 0 && (
        <Stack spacing={1}>
          <Typography variant="subtitle2">{t.dependencies.unmetTitle}</Typography>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {report.missingDependencies.map((missing) => (
              <Chip
                key={missing.modId}
                size="small"
                color={missing.presentButDisabled ? 'warning' : 'error'}
                variant="outlined"
                label={t.dependencies.missingChip(missing.modId, missing.presentButDisabled)}
                onClick={() => {
                  const requester = report.mods.find((mod) =>
                    missing.requiredBy.includes(mod.name ?? mod.fileName)
                  )
                  if (requester) onShowMod(requester.filePath)
                }}
              />
            ))}
          </Stack>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t.dependencies.unmetHint}
          </Typography>
        </Stack>
      )}
    </Stack>
  )
}

function SummaryTile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Box sx={{ p: 2, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="h5" sx={{ lineHeight: 1.2 }}>
        {value}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {detail}
      </Typography>
    </Box>
  )
}
