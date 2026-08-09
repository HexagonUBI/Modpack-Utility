import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import {
  Avatar,
  Box,
  Button,
  Chip,
  Collapse,
  IconButton,
  InputAdornment,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography
} from '@mui/material'
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded'
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded'
import ExtensionOutlined from '@mui/icons-material/ExtensionOutlined'
import FolderOpenRounded from '@mui/icons-material/FolderOpenRounded'
import SearchRounded from '@mui/icons-material/SearchRounded'
import {
  hasProblems,
  sideOf,
  type ModFile,
  type ModSide,
  type ModSideInfo,
  type ModsReport
} from '@shared/types'
import { formatBytes } from '../format'
import InsightCard from '../components/InsightCard'
import EmptyState from '../components/EmptyState'
import { applyDirection, SortHeaderCell, useSort } from '../components/SortableTable'
import { useT } from '../i18n'

type ModFilter = 'all' | 'enabled' | 'disabled' | 'unidentified'

type SideFilter = 'all' | 'client' | 'server' | 'both'

interface ModsTabProps {
  report: ModsReport
  busy: boolean

  revealPath: string | null
  onRevealHandled: () => void
  onReveal: (path: string) => void
  onToggleEnabled: (path: string, enabled: boolean) => void
}

export default function ModsTab({
  report,
  busy,
  revealPath,
  onRevealHandled,
  onReveal,
  onToggleEnabled
}: ModsTabProps) {
  const t = useT()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ModFilter>('all')
  const [sideFilter, setSideFilter] = useState<SideFilter>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const rowRefs = useRef(new Map<string, HTMLTableRowElement>())

  useEffect(() => {
    if (revealPath === null) return

    setQuery('')
    setFilter('all')
    setSideFilter('all')
    setExpanded(revealPath)

    const timer = window.setTimeout(() => {
      rowRefs.current.get(revealPath)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      onRevealHandled()
    }, 60)

    return () => window.clearTimeout(timer)
  }, [revealPath, onRevealHandled])
  const sorter = useSort<'name' | 'version' | 'loader' | 'side' | 'size' | 'status'>('name', 'asc')

  const sideCounts = useMemo(
    () => ({
      client: report.mods.filter((mod) => sideOf(mod.side) === 'client').length,
      server: report.mods.filter((mod) => sideOf(mod.side) === 'server').length
    }),
    [report.mods]
  )

  const visible = useMemo(() => {
    const filtered = filterMods(report.mods, filter, sideFilter, query)
    const { key, direction } = sorter.sort

    return [...filtered].sort((a, b) => {
      const comparison =
        key === 'version'
          ? (a.version ?? '').localeCompare(b.version ?? '', undefined, { numeric: true })
          : key === 'loader'
            ? a.loaderType.localeCompare(b.loaderType)
            : key === 'side'
              ? sideRank(sideOf(a.side)) - sideRank(sideOf(b.side))
              : key === 'size'
                ? a.sizeBytes - b.sizeBytes
                : key === 'status'
                  ? Number(a.enabled) - Number(b.enabled)
                  : displayName(a).localeCompare(displayName(b), undefined, { sensitivity: 'base' })

      if (comparison !== 0) return applyDirection(comparison, direction)
      return displayName(a).localeCompare(displayName(b))
    })
  }, [report.mods, filter, sideFilter, query, sorter.sort])

  if (!report.exists) {
    return <EmptyState title={t.mods.noModsFolder} detail={t.mods.noModsFolderDetail} />
  }

  return (
    <Stack spacing={2}>
      {report.conflicts.length > 0 && (
        <InsightCard
          insight={{
            id: 'conflicts',
            severity: 'critical',
            title: t.insights.conflictsTitle(report.conflicts.length),
            detail: report.conflicts
              .map((conflict) => t.dependencies.conflictSummary(conflict.declaredBy, conflict.modId))
              .join('. ')
          }}
        />
      )}

      {report.missingDependencies.length > 0 && (
        <InsightCard
          insight={{
            id: 'missing',
            severity: report.missingDependencies.some((entry) => !entry.presentButDisabled)
              ? 'critical'
              : 'serious',
            title: t.dependencies.unmetCount(report.missingDependencies.length),
            detail: report.missingDependencies
              .map((entry) =>
                t.dependencies.neededBy(
                  entry.modId,
                  entry.presentButDisabled,
                  entry.requiredBy.join(', ')
                )
              )
              .join(' - ')
          }}
        />
      )}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' } }}>
        <TextField
          size="small"
          placeholder={t.mods.searchMods}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          sx={{ flex: 1, minWidth: 220 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRounded fontSize="small" />
                </InputAdornment>
              )
            }
          }}
        />
        <ToggleButtonGroup
          size="small"
          exclusive
          value={filter}
          onChange={(_event, next: ModFilter | null) => next && setFilter(next)}
        >
          <ToggleButton value="all">{t.mods.allWithCount(report.mods.length)}</ToggleButton>
          <ToggleButton value="enabled">{t.common.enabled}</ToggleButton>
          <ToggleButton value="disabled">{t.common.disabled}</ToggleButton>
          <ToggleButton value="unidentified">{t.mods.unidentified}</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={sideFilter}
          onChange={(_event, next: SideFilter | null) => next && setSideFilter(next)}
        >
          <ToggleButton value="all">{t.mods.sideAll}</ToggleButton>
          <ToggleButton value="client">{t.mods.sideClientShort}</ToggleButton>
          <ToggleButton value="server">{t.mods.sideServerShort}</ToggleButton>
          <ToggleButton value="both">{t.mods.sideBothShort}</ToggleButton>
        </ToggleButtonGroup>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t.mods.sideSummary(sideCounts.client, sideCounts.server)}
        </Typography>
      </Stack>

      {visible.length === 0 ? (
        <EmptyState title={t.common.nothingMatches} detail={t.common.tryDifferentSearch} />
      ) : (
        <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell width={40} />
                <SortHeaderCell columnKey="name" sorter={sorter}>
                  {t.mods.mod}
                </SortHeaderCell>
                <SortHeaderCell columnKey="version" sorter={sorter}>
                  {t.common.version}
                </SortHeaderCell>
                <SortHeaderCell columnKey="loader" sorter={sorter}>
                  {t.common.loader}
                </SortHeaderCell>
                <SortHeaderCell columnKey="side" sorter={sorter}>
                  {t.mods.side}
                </SortHeaderCell>
                <SortHeaderCell columnKey="size" sorter={sorter} numeric align="right">
                  {t.common.size}
                </SortHeaderCell>
                <SortHeaderCell columnKey="status" sorter={sorter}>
                  {t.common.status}
                </SortHeaderCell>
                <TableCell width={48} />
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.map((mod) => {
                const isOpen = expanded === mod.filePath
                return (
                  <Fragment key={mod.filePath}>
                    <TableRow
                      hover
                      ref={(node: HTMLTableRowElement | null) => {
                        if (node) rowRefs.current.set(mod.filePath, node)
                        else rowRefs.current.delete(mod.filePath)
                      }}
                      selected={isOpen}
                      sx={{ cursor: 'pointer', '& > *': { borderBottom: isOpen ? 'unset' : undefined } }}
                      onClick={() => setExpanded(isOpen ? null : mod.filePath)}
                    >
                      <TableCell>
                        <ExpandMoreRounded
                          fontSize="small"
                          sx={{
                            transition: 'transform 150ms',
                            transform: isOpen ? 'rotate(180deg)' : 'none',
                            color: 'text.secondary'
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                          <Avatar
                            variant="rounded"
                            src={mod.iconDataUrl ?? undefined}
                            sx={{
                              width: 28,
                              height: 28,
                              borderRadius: 1,
                              bgcolor: 'action.hover',

                              '& img': { imageRendering: 'pixelated' }
                            }}
                          >
                            <ExtensionOutlined sx={{ fontSize: 16, color: 'text.secondary' }} />
                          </Avatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 600,

                                  color: hasProblems(mod.problems) ? 'error.main' : undefined
                                }}
                              >
                                {mod.name ?? mod.fileName}
                              </Typography>
                              {hasProblems(mod.problems) && (
                                <Tooltip title={describeProblems(mod, t)}>
                                  <ErrorOutlineRounded sx={{ fontSize: 15, color: 'error.main' }} />
                                </Tooltip>
                              )}
                            </Stack>
                            {mod.modId && (
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {mod.modId}
                              </Typography>
                            )}
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{mod.version ?? '-'}</TableCell>
                      <TableCell>
                        {mod.loaderType === 'unknown' ? '-' : t.loaders[mod.loaderType]}
                      </TableCell>
                      <TableCell>
                        <Tooltip
                          title={t.mods.sideTooltip(
                            sideLabel(mod.side, t),
                            t.mods.sideSource[mod.side.source]
                          )}
                        >
                          <Chip
                            size="small"
                            variant="outlined"
                            color={sideOf(mod.side) === 'both' ? 'default' : 'primary'}
                            label={sideLabel(mod.side, t)}
                            sx={{
                              opacity: mod.side.source === 'loaderDefault' ? 0.65 : 1,
                              borderStyle: mod.side.source === 'declared' ? 'solid' : 'dashed'
                            }}
                          />
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatBytes(mod.sizeBytes, t)}
                      </TableCell>
                      <TableCell onClick={(event) => event.stopPropagation()}>
                        <Tooltip title={mod.enabled ? t.common.disabled : t.common.enabled}>
                          <Switch
                            size="small"
                            checked={mod.enabled}
                            disabled={busy}
                            onChange={(event) => onToggleEnabled(mod.filePath, event.target.checked)}
                            slotProps={{ input: { 'aria-label': mod.name ?? mod.fileName } }}
                          />
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={t.common.showInFolder}>
                          <IconButton
                            size="small"
                            onClick={(event) => {
                              event.stopPropagation()
                              onReveal(mod.filePath)
                            }}
                          >
                            <FolderOpenRounded fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={8} sx={{ py: 0, border: isOpen ? undefined : 'none' }}>
                        <Collapse in={isOpen} timeout="auto" unmountOnExit>
                          <ModDetails mod={mod} t={t} onReveal={onReveal} />
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  )
}

interface ModDetailsProps {
  mod: ModFile
  t: ReturnType<typeof useT>
  onReveal: (path: string) => void
}

function ModDetails({ mod, t, onReveal }: ModDetailsProps) {
  const required = mod.dependencies.filter((dependency) => dependency.kind === 'required')
  const optional = mod.dependencies.filter((dependency) => dependency.kind === 'optional')
  const incompatible = mod.dependencies.filter((dependency) => dependency.kind === 'incompatible')

  return (
    <Stack spacing={1.5} sx={{ py: 2, px: 1 }}>
      {mod.description && (
        <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap' }}>
          {mod.description.trim()}
        </Typography>
      )}

      {mod.parseError && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t.mods.noManifest(
            mod.parseError.kind === 'noManifest' ? t.mods.manifestMissing : mod.parseError.detail
          )}
        </Typography>
      )}

      <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {mod.authors.length > 0 && <Fact label={t.mods.authors} value={mod.authors.join(', ')} />}
        <Fact
          label={t.mods.runsOn}
          value={t.mods.sideTooltip(sideLabel(mod.side, t), t.mods.sideSource[mod.side.source])}
        />
        {mod.provides.length > 0 && (
          <Fact label={t.mods.alsoProvides} value={mod.provides.join(', ')} />
        )}
        <Fact label={t.mods.file} value={mod.fileName} />
      </Box>

      {required.length > 0 && (
        <Fact label={t.mods.requires} value={required.map(describeDependency).join(', ')} />
      )}
      {optional.length > 0 && (
        <Fact label={t.mods.worksWith} value={optional.map(describeDependency).join(', ')} />
      )}
      {incompatible.length > 0 && (
        <Fact label={t.mods.incompatibleWith} value={incompatible.map(describeDependency).join(', ')} />
      )}

      <Stack direction="row" spacing={1}>
        <Button size="small" startIcon={<FolderOpenRounded />} onClick={() => onReveal(mod.filePath)}>
          {t.common.showInFolder}
        </Button>
      </Stack>
    </Stack>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
        {value}
      </Typography>
    </Box>
  )
}

function describeDependency(dependency: { modId: string; versionRange: string | null }): string {
  return dependency.versionRange ? `${dependency.modId} ${dependency.versionRange}` : dependency.modId
}

function displayName(mod: ModFile): string {
  return mod.name ?? mod.fileName
}

function describeProblems(mod: ModFile, t: ReturnType<typeof useT>): string {
  const parts: string[] = []
  if (mod.problems.missing.length > 0) {
    parts.push(`${t.dependencies.missing}: ${mod.problems.missing.join(', ')}`)
  }
  if (mod.problems.disabledDependencies.length > 0) {
    parts.push(`${t.dependencies.installedButDisabled}: ${mod.problems.disabledDependencies.join(', ')}`)
  }
  if (mod.problems.conflictsWith.length > 0) {
    parts.push(`${t.dependencies.conflicts}: ${mod.problems.conflictsWith.join(', ')}`)
  }
  return parts.join('. ')
}

function sideRank(side: ModSide): number {
  switch (side) {
    case 'client':
      return 0
    case 'server':
      return 1
    default:
      return 2
  }
}

function sideLabel(info: ModSideInfo, t: ReturnType<typeof useT>): string {
  if (info.server === 'unsupported') return t.mods.sideClientShort
  if (info.client === 'unsupported') return t.mods.sideServerShort

  const clientOptional = info.client === 'optional'
  const serverOptional = info.server === 'optional'

  if (clientOptional && serverOptional) return t.mods.sideBothOptional
  if (serverOptional) return t.mods.sideClientServerOptional
  if (clientOptional) return t.mods.sideServerClientOptional
  return t.mods.sideBothShort
}

function filterMods(
  mods: ModFile[],
  filter: ModFilter,
  sideFilter: SideFilter,
  query: string
): ModFile[] {
  const needle = query.trim().toLowerCase()

  return mods.filter((mod) => {
    if (filter === 'enabled' && !mod.enabled) return false
    if (filter === 'disabled' && mod.enabled) return false
    if (filter === 'unidentified' && mod.parseError === null) return false
    if (sideFilter !== 'all' && sideOf(mod.side) !== sideFilter) return false
    if (needle === '') return true

    return (
      (mod.name ?? '').toLowerCase().includes(needle) ||
      (mod.modId ?? '').toLowerCase().includes(needle) ||
      mod.fileName.toLowerCase().includes(needle)
    )
  })
}
