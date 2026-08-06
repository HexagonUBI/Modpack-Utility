import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  InputAdornment,
  LinearProgress,
  Stack,
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
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded'
import FolderOpenRounded from '@mui/icons-material/FolderOpenRounded'
import FolderRounded from '@mui/icons-material/FolderRounded'
import InsertDriveFileOutlined from '@mui/icons-material/InsertDriveFileOutlined'
import SearchRounded from '@mui/icons-material/SearchRounded'
import TuneRounded from '@mui/icons-material/TuneRounded'
import {
  CONFIG_STATUS_LABELS,
  type ConfigEntry,
  type ConfigReport,
  type ConfigStatus,
  type SizeNode
} from '@shared/types'
import { formatBytes } from '../format'
import EmptyState from '../components/EmptyState'
import ConfigEditor from '../components/ConfigEditor'
import {
  applyDirection,
  compareFoldersFirst,
  SortHeaderCell,
  useSort
} from '../components/SortableTable'
import { useDirectoryExpansion, type DirectoryExpansion } from '../hooks'
import { useT } from '../i18n'

type StatusFilter = ConfigStatus | 'all'

interface ConfigsTabProps {
  report: ConfigReport
  busy: boolean
  onReveal: (path: string) => void
  onOpen: (path: string) => void
  onPurge: (paths: string[]) => void
  onConfigSaved: (message: string) => void
}

const EDITABLE_EXTENSION = /\.(toml|json|properties|cfg|txt)$/i

export function isEditableConfig(name: string): boolean {
  return EDITABLE_EXTENSION.test(name)
}

const STATUS_COLOUR: Record<ConfigStatus, 'default' | 'warning' | 'error' | 'success'> = {
  owned: 'success',
  inactive: 'warning',
  orphaned: 'error',
  system: 'default',
  unmatched: 'default'
}

const LOW_CONFIDENCE = 0.6
const BACKUP_SUFFIX = /\.(bak|old|disabled)$/i

interface QuickSelect {
  id: string
  label: string
  hint: string
  match: (entry: ConfigEntry) => boolean
}

const QUICK_SELECTS: QuickSelect[] = [
  {
    id: 'orphaned',
    label: 'No matching mod',
    hint: 'Config left behind by mods that are no longer installed',
    match: (entry) => entry.status === 'orphaned'
  },
  {
    id: 'inactive',
    label: 'From disabled mods',
    hint: 'Settings for mods that are present but switched off. Keep these if you plan to re-enable them',
    match: (entry) => entry.status === 'inactive'
  },
  {
    id: 'low-confidence',
    label: 'Uncertain matches',
    hint: 'Attributed to a mod, but with low confidence. Worth reviewing by hand',
    match: (entry) => entry.confidence > 0 && entry.confidence < LOW_CONFIDENCE
  },
  {
    id: 'backups',
    label: 'Backups and .old files',
    hint: 'Superseded copies the mods themselves left behind',
    match: (entry) => BACKUP_SUFFIX.test(entry.relativePath)
  }
]

export default function ConfigsTab({
  report,
  busy,
  onReveal,
  onOpen,
  onPurge,
  onConfigSaved
}: ConfigsTabProps) {
  const t = useT()

  const sorter = useSort<'name' | 'owner' | 'confidence' | 'size' | 'status'>('name', 'asc')
  const [editingPath, setEditingPath] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirming, setConfirming] = useState(false)
  const expansion = useDirectoryExpansion()

  useEffect(() => setSelected(new Set()), [report.configDir, report.entries.length])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = report.entries.filter((entry) => {
      if (filter !== 'all' && entry.status !== filter) return false
      if (needle === '') return true
      return (
        entry.relativePath.toLowerCase().includes(needle) ||
        (entry.ownerModName ?? '').toLowerCase().includes(needle) ||
        (entry.ownerModId ?? '').toLowerCase().includes(needle)
      )
    })

    const { key, direction } = sorter.sort
    return [...filtered].sort((a, b) => {
      const comparison =
        key === 'name'
          ? compareFoldersFirst(
              { isDirectory: a.isDirectory, name: a.relativePath },
              { isDirectory: b.isDirectory, name: b.relativePath }
            )
          : key === 'owner'
            ? (a.ownerModName ?? '').localeCompare(b.ownerModName ?? '')
            : key === 'confidence'
              ? a.confidence - b.confidence
              : key === 'status'
                ? a.status.localeCompare(b.status)
                : a.sizeBytes - b.sizeBytes

      if (comparison !== 0) return applyDirection(comparison, direction)
      return a.relativePath.localeCompare(b.relativePath)
    })
  }, [report.entries, filter, query, sorter.sort])

  const selectedEntries = useMemo(
    () => report.entries.filter((entry) => selected.has(entry.path)),
    [report.entries, selected]
  )
  const selectedBytes = selectedEntries.reduce((sum, entry) => sum + entry.sizeBytes, 0)

  const gameOptions = report.gameOptionsPath ? (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{ alignItems: 'center', p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
    >
      <TuneRounded fontSize="small" sx={{ color: 'text.secondary' }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          options.txt
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t.configs.gameOptionsDetail}
        </Typography>
      </Box>
      <Button size="small" variant="outlined" onClick={() => setEditingPath(report.gameOptionsPath)}>
        {t.common.editSettings}
      </Button>
    </Stack>
  ) : null

  if (!report.exists) {
    return (
      <Stack spacing={2}>
        {gameOptions}
        <EmptyState title={t.configs.noConfigFolder} detail={t.configs.noConfigFolderDetail} />
        <ConfigEditor
          path={editingPath}
          onClose={() => setEditingPath(null)}
          onSaved={onConfigSaved}
          onOpenExternally={onOpen}
        />
      </Stack>
    )
  }

  const toggle = (path: string): void => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const applyQuickSelect = (preset: QuickSelect): void => {
    setSelected(new Set(report.entries.filter(preset.match).map((entry) => entry.path)))
  }

  const allVisibleSelected = visible.length > 0 && visible.every((entry) => selected.has(entry.path))
  const someVisibleSelected = visible.some((entry) => selected.has(entry.path))

  const toggleAllVisible = (): void => {
    setSelected((current) => {
      const next = new Set(current)
      if (allVisibleSelected) for (const entry of visible) next.delete(entry.path)
      else for (const entry of visible) next.add(entry.path)
      return next
    })
  }

  return (
    <Stack spacing={2}>
      {gameOptions}

      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <SummaryTile label="Matched to a mod" value={String(report.totals.owned)} detail="Config is in use" />
        <SummaryTile
          label="Disabled mod"
          value={String(report.totals.inactive)}
          detail="Settings kept for later"
        />
        <SummaryTile
          label="No matching mod"
          value={String(report.totals.orphaned)}
          detail={`${formatBytes(report.reclaimableBytes)} reclaimable`}
        />
        <SummaryTile
          label="Loader and system"
          value={String(report.totals.system)}
          detail="Not owned by any mod"
        />
      </Box>

      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
          Quick select
        </Typography>
        {QUICK_SELECTS.map((preset) => {
          const count = report.entries.filter(preset.match).length
          return (
            <Tooltip key={preset.id} title={preset.hint}>
              <span>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={count === 0}
                  onClick={() => applyQuickSelect(preset)}
                >
                  {preset.label} ({count})
                </Button>
              </span>
            </Tooltip>
          )
        })}
        {selected.size > 0 && (
          <Button size="small" onClick={() => setSelected(new Set())}>
            Clear selection
          </Button>
        )}
      </Stack>

      {selected.size > 0 && (
        <Alert
          severity="info"
          icon={false}
          action={
            <Button
              color="error"
              size="small"
              variant="contained"
              startIcon={<DeleteOutlineRounded />}
              disabled={busy}
              onClick={() => setConfirming(true)}
            >
              Move to recycle bin
            </Button>
          }
        >
          {selected.size} selected, {formatBytes(selectedBytes)}
        </Alert>
      )}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' } }}>
        <TextField
          size="small"
          placeholder="Search configs..."
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
          onChange={(_event, next: StatusFilter | null) => next && setFilter(next)}
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="owned">Active</ToggleButton>
          <ToggleButton value="inactive">Disabled</ToggleButton>
          <ToggleButton value="orphaned">Unmatched</ToggleButton>
          <ToggleButton value="system">System</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {visible.length === 0 ? (
        <EmptyState title="Nothing matches" detail="Try a different search term or filter." />
      ) : (
        <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={allVisibleSelected}
                    indeterminate={someVisibleSelected && !allVisibleSelected}
                    onChange={toggleAllVisible}
                    slotProps={{ input: { 'aria-label': 'Select all shown configs' } }}
                  />
                </TableCell>
                <SortHeaderCell columnKey="name" sorter={sorter}>
                  {t.configs.config}
                </SortHeaderCell>
                <SortHeaderCell columnKey="owner" sorter={sorter}>
                  {t.configs.belongsTo}
                </SortHeaderCell>
                <SortHeaderCell columnKey="confidence" sorter={sorter} numeric width={150}>
                  {t.configs.confidence}
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
              {visible.map((entry) => (
                <ConfigRow
                  key={entry.path}
                  entry={entry}
                  selected={selected.has(entry.path)}
                  expansion={expansion}
                  onToggle={() => toggle(entry.path)}
                  onReveal={onReveal}
                  onOpen={onOpen}
                  onEdit={setEditingPath}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {report.modsWithoutConfig.length > 0 && (
        <Stack spacing={1}>
          <Typography variant="subtitle2">
            {report.modsWithoutConfig.length} installed{' '}
            {report.modsWithoutConfig.length === 1 ? 'mod has' : 'mods have'} no config of their own
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Perfectly normal. Many mods need no configuration, and some write into another mod&apos;s folder.{' '}
            {report.modsWithoutConfig.map((mod) => mod.name).join(', ')}
          </Typography>
        </Stack>
      )}

      <ConfigEditor
        path={editingPath}
        onClose={() => setEditingPath(null)}
        onSaved={onConfigSaved}
        onOpenExternally={onOpen}
      />

      <Dialog open={confirming} onClose={() => setConfirming(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Move {selected.size} config entries to the recycle bin?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            This frees {formatBytes(selectedBytes)}. Nothing is deleted permanently, so you can restore from
            the recycle bin if a mod turns out to have needed one of these.
          </DialogContentText>
          <Box
            sx={{
              maxHeight: 220,
              overflowY: 'auto',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              p: 1
            }}
          >
            {selectedEntries.map((entry) => (
              <Typography key={entry.path} variant="body2" sx={{ fontFamily: 'ui-monospace, monospace' }}>
                {entry.relativePath}
                {entry.ownerModName ? `  (${entry.ownerModName})` : ''}
              </Typography>
            ))}
          </Box>
          {selectedEntries.some((entry) => entry.status === 'owned') && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Some of these belong to mods that are installed and enabled. Removing them resets those mods to
              their default settings.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirming(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              setConfirming(false)
              onPurge(selectedEntries.map((entry) => entry.path))
            }}
          >
            Move to recycle bin
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

interface ConfigRowProps {
  entry: ConfigEntry
  selected: boolean
  expansion: DirectoryExpansion
  onToggle: () => void
  onReveal: (path: string) => void
  onOpen: (path: string) => void
  onEdit: (path: string) => void
}

function ConfigRow({ entry, selected, expansion, onToggle, onReveal, onOpen, onEdit }: ConfigRowProps) {
  const open = expansion.isExpanded(entry.path)
  const loading = expansion.isLoading(entry.path)
  const children = open ? expansion.childrenOf(entry.path, null) : null

  return (
    <Fragment>
    <TableRow hover selected={selected}>
      <TableCell padding="checkbox">
        <Checkbox
          checked={selected}
          onChange={onToggle}
          slotProps={{ input: { 'aria-label': entry.relativePath } }}
        />
      </TableCell>
      <TableCell>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          {entry.isDirectory ? (
            <IconButton
              size="small"
              aria-label={open ? `Collapse ${entry.relativePath}` : `Expand ${entry.relativePath}`}
              onClick={() => expansion.toggle(entry.path, null)}
              sx={{ p: 0.25 }}
            >
              {loading ? (
                <CircularProgress size={14} />
              ) : (
                <ExpandMoreRounded
                  fontSize="small"
                  sx={{ transition: 'transform 150ms', transform: open ? 'none' : 'rotate(-90deg)' }}
                />
              )}
            </IconButton>
          ) : (
            <Box sx={{ width: 22 }} />
          )}

          {entry.isDirectory ? (
            <FolderRounded fontSize="small" sx={{ color: 'text.secondary' }} />
          ) : (
            <InsertDriveFileOutlined fontSize="small" sx={{ color: 'text.secondary' }} />
          )}
          <Box sx={{ minWidth: 0, ml: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {entry.relativePath}
            </Typography>
            {entry.isDirectory && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {entry.fileCount} {entry.fileCount === 1 ? 'file' : 'files'}
              </Typography>
            )}
          </Box>
        </Stack>
      </TableCell>
      <TableCell>
        {entry.ownerModName ? (
          <Box>
            <Typography variant="body2">{entry.ownerModName}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {entry.ownerModId}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            -
          </Typography>
        )}
      </TableCell>
      <TableCell>
        <Tooltip title={entry.reason}>
          <Box>
            <LinearProgress
              variant="determinate"
              value={Math.round(entry.confidence * 100)}
              color={entry.confidence >= 0.8 ? 'success' : entry.confidence > 0 ? 'warning' : 'inherit'}
              sx={{ opacity: entry.confidence > 0 ? 1 : 0.25 }}
            />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {entry.confidence > 0 ? `${Math.round(entry.confidence * 100)}% sure` : 'No match'}
            </Typography>
          </Box>
        </Tooltip>
      </TableCell>
      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
        {formatBytes(entry.sizeBytes)}
      </TableCell>
      <TableCell>
        <Chip
          size="small"
          variant="outlined"
          color={STATUS_COLOUR[entry.status]}
          label={CONFIG_STATUS_LABELS[entry.status]}
        />
      </TableCell>
      <TableCell>
        <Stack direction="row">
          {!entry.isDirectory && isEditableConfig(entry.relativePath) && (
            <Tooltip title="Edit settings">
              <IconButton size="small" onClick={() => onEdit(entry.path)}>
                <TuneRounded fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Show in folder">
            <IconButton size="small" onClick={() => onReveal(entry.path)}>
              <FolderOpenRounded fontSize="small" />
            </IconButton>
          </Tooltip>
          {!entry.isDirectory && (
            <Tooltip title="Open file">
              <IconButton size="small" onClick={() => onOpen(entry.path)}>
                <InsertDriveFileOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </TableCell>
    </TableRow>

      {open &&
        children?.map((child) => (
          <ConfigChildRow
            key={child.path}
            node={child}
            depth={1}
            expansion={expansion}
            onReveal={onReveal}
            onOpen={onOpen}
            onEdit={onEdit}
          />
        ))}
    </Fragment>
  )
}

interface ConfigChildRowProps {
  node: SizeNode
  depth: number
  expansion: DirectoryExpansion
  onReveal: (path: string) => void
  onOpen: (path: string) => void
  onEdit: (path: string) => void
}

const CHILD_INDENT = 22

function ConfigChildRow({ node, depth, expansion, onReveal, onOpen, onEdit }: ConfigChildRowProps) {
  const open = expansion.isExpanded(node.path)
  const loading = expansion.isLoading(node.path)
  const children = open ? expansion.childrenOf(node.path, null) : null

  return (
    <Fragment>
      <TableRow hover>
        <TableCell padding="checkbox" />
        <TableCell>
          <Stack
            direction="row"
            spacing={0.5}
            sx={{ alignItems: 'center', pl: `${depth * CHILD_INDENT}px` }}
          >
            {node.isDirectory ? (
              <IconButton
                size="small"
                aria-label={open ? `Collapse ${node.name}` : `Expand ${node.name}`}
                onClick={() => expansion.toggle(node.path, null)}
                sx={{ p: 0.25 }}
              >
                {loading ? (
                  <CircularProgress size={14} />
                ) : (
                  <ExpandMoreRounded
                    fontSize="small"
                    sx={{ transition: 'transform 150ms', transform: open ? 'none' : 'rotate(-90deg)' }}
                  />
                )}
              </IconButton>
            ) : (
              <Box sx={{ width: 22 }} />
            )}
            {node.isDirectory ? (
              <FolderRounded fontSize="small" sx={{ color: 'text.secondary' }} />
            ) : (
              <InsertDriveFileOutlined fontSize="small" sx={{ color: 'text.secondary' }} />
            )}
            <Typography variant="body2" sx={{ ml: 0.5, color: 'text.secondary' }}>
              {node.name}
            </Typography>
          </Stack>
        </TableCell>
        <TableCell />
        <TableCell />
        <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.secondary' }}>
          {formatBytes(node.sizeBytes)}
        </TableCell>
        <TableCell />
        <TableCell>
          <Stack direction="row">
            {!node.isDirectory && isEditableConfig(node.name) && (
              <Tooltip title="Edit settings">
                <IconButton size="small" onClick={() => onEdit(node.path)}>
                  <TuneRounded fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Show in folder">
              <IconButton size="small" onClick={() => onReveal(node.path)}>
                <FolderOpenRounded fontSize="small" />
              </IconButton>
            </Tooltip>
            {!node.isDirectory && (
              <Tooltip title="Open file">
                <IconButton size="small" onClick={() => onOpen(node.path)}>
                  <InsertDriveFileOutlined fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </TableCell>
      </TableRow>

      {open &&
        children?.map((child) => (
          <ConfigChildRow
            key={child.path}
            node={child}
            depth={depth + 1}
            expansion={expansion}
            onReveal={onReveal}
            onOpen={onOpen}
            onEdit={onEdit}
          />
        ))}
    </Fragment>
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
