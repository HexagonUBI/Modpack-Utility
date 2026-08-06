import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import {
  Avatar,
  Box,
  Button,
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
import { hasProblems, type ModFile, type ModsReport } from '@shared/types'
import { formatBytes } from '../format'
import InsightCard from '../components/InsightCard'
import EmptyState from '../components/EmptyState'
import { applyDirection, SortHeaderCell, useSort } from '../components/SortableTable'
import { useT } from '../i18n'

type ModFilter = 'all' | 'enabled' | 'disabled' | 'unidentified'

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
  const [expanded, setExpanded] = useState<string | null>(null)
  const rowRefs = useRef(new Map<string, HTMLTableRowElement>())

  useEffect(() => {
    if (revealPath === null) return

    setQuery('')
    setFilter('all')
    setExpanded(revealPath)

    const timer = window.setTimeout(() => {
      rowRefs.current.get(revealPath)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      onRevealHandled()
    }, 60)

    return () => window.clearTimeout(timer)
  }, [revealPath, onRevealHandled])
  const sorter = useSort<'name' | 'version' | 'loader' | 'size' | 'status'>('name', 'asc')

  const visible = useMemo(() => {
    const filtered = filterMods(report.mods, filter, query)
    const { key, direction } = sorter.sort

    return [...filtered].sort((a, b) => {
      const comparison =
        key === 'version'
          ? (a.version ?? '').localeCompare(b.version ?? '', undefined, { numeric: true })
          : key === 'loader'
            ? a.loaderType.localeCompare(b.loaderType)
            : key === 'size'
              ? a.sizeBytes - b.sizeBytes
              : key === 'status'
                ? Number(a.enabled) - Number(b.enabled)
                : displayName(a).localeCompare(displayName(b), undefined, { sensitivity: 'base' })

      if (comparison !== 0) return applyDirection(comparison, direction)
      return displayName(a).localeCompare(displayName(b))
    })
  }, [report.mods, filter, query, sorter.sort])

  if (!report.exists) {
    return (
      <EmptyState
        title="No mods folder"
        detail="This instance has no mods directory, so there is nothing to inspect here yet."
      />
    )
  }

  return (
    <Stack spacing={2}>
      {report.conflicts.length > 0 && (
        <InsightCard
          insight={{
            id: 'conflicts',
            severity: 'critical',
            title: `${report.conflicts.length} incompatible ${report.conflicts.length === 1 ? 'mod' : 'mods'} installed together`,
            detail: report.conflicts
              .map((conflict) => `${conflict.declaredBy} declares ${conflict.modId} incompatible`)
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
            title: `${report.missingDependencies.length} unmet ${
              report.missingDependencies.length === 1 ? 'dependency' : 'dependencies'
            }`,
            detail: report.missingDependencies
              .map(
                (entry) =>
                  `${entry.modId}${entry.presentButDisabled ? ' (present but disabled)' : ''} - needed by ${entry.requiredBy.join(', ')}`
              )
              .join(' - ')
          }}
        />
      )}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' } }}>
        <TextField
          size="small"
          placeholder="Search mods..."
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
          <ToggleButton value="all">All {report.mods.length}</ToggleButton>
          <ToggleButton value="enabled">Enabled</ToggleButton>
          <ToggleButton value="disabled">Disabled</ToggleButton>
          <ToggleButton value="unidentified">Unidentified</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {visible.length === 0 ? (
        <EmptyState title="Nothing matches" detail="Try a different search term or filter." />
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
                      <TableCell>{loaderLabel(mod)}</TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatBytes(mod.sizeBytes)}
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
                        <Tooltip title="Show in folder">
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
                      <TableCell colSpan={7} sx={{ py: 0, border: isOpen ? undefined : 'none' }}>
                        <Collapse in={isOpen} timeout="auto" unmountOnExit>
                          <ModDetails mod={mod} onReveal={onReveal} />
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

function ModDetails({ mod, onReveal }: { mod: ModFile; onReveal: (path: string) => void }) {
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
          No readable manifest ({mod.parseError}). This is normal for libraries and coremods.
        </Typography>
      )}

      <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {mod.authors.length > 0 && <Fact label="Authors" value={mod.authors.join(', ')} />}
        {mod.environment && <Fact label="Runs on" value={environmentLabel(mod.environment)} />}
        {mod.provides.length > 0 && <Fact label="Also provides" value={mod.provides.join(', ')} />}
        <Fact label="File" value={mod.fileName} />
      </Box>

      {required.length > 0 && <Fact label="Requires" value={required.map(describeDependency).join(', ')} />}
      {optional.length > 0 && (
        <Fact label="Works with (optional)" value={optional.map(describeDependency).join(', ')} />
      )}
      {incompatible.length > 0 && (
        <Fact label="Incompatible with" value={incompatible.map(describeDependency).join(', ')} />
      )}

      <Stack direction="row" spacing={1}>
        <Button size="small" startIcon={<FolderOpenRounded />} onClick={() => onReveal(mod.filePath)}>
          Show in folder
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

function environmentLabel(environment: 'client' | 'server' | 'both'): string {
  switch (environment) {
    case 'client':
      return 'Client only'
    case 'server':
      return 'Server only'
    default:
      return 'Client and server'
  }
}

function loaderLabel(mod: ModFile): string {
  switch (mod.loaderType) {
    case 'neoforge':
      return 'NeoForge'
    case 'forge':
      return 'Forge'
    case 'legacy-forge':
      return 'Forge (legacy)'
    case 'fabric':
      return 'Fabric'
    case 'quilt':
      return 'Quilt'
    default:
      return '-'
  }
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

function filterMods(mods: ModFile[], filter: ModFilter, query: string): ModFile[] {
  const needle = query.trim().toLowerCase()

  return mods.filter((mod) => {
    if (filter === 'enabled' && !mod.enabled) return false
    if (filter === 'disabled' && mod.enabled) return false
    if (filter === 'unidentified' && mod.parseError === null) return false
    if (needle === '') return true

    return (
      (mod.name ?? '').toLowerCase().includes(needle) ||
      (mod.modId ?? '').toLowerCase().includes(needle) ||
      mod.fileName.toLowerCase().includes(needle)
    )
  })
}
