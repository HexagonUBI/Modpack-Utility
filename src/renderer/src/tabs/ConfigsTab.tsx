import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
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
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded'
import FolderOpenRounded from '@mui/icons-material/FolderOpenRounded'
import FolderRounded from '@mui/icons-material/FolderRounded'
import InsertDriveFileOutlined from '@mui/icons-material/InsertDriveFileOutlined'
import SearchRounded from '@mui/icons-material/SearchRounded'
import TuneRounded from '@mui/icons-material/TuneRounded'
import type {
  ConfigEntry,
  ConfigMatchReason,
  ConfigReport,
  ConfigStatus,
  SizeNode
} from '@shared/types'
import { formatBytes } from '../format'
import EmptyState from '../components/EmptyState'
import ConfigEditor from '../components/ConfigEditor'
import SelectionBar from '../components/SelectionBar'
import PurgeActions from '../components/PurgeActions'
import {
  applyDirection,
  compareFoldersFirst,
  SortHeaderCell,
  useSort
} from '../components/SortableTable'
import { useDirectoryExpansion, type DirectoryExpansion } from '../hooks'
import { useT, type Messages } from '../i18n'

type StatusFilter = ConfigStatus | 'all'

interface ConfigsTabProps {
  report: ConfigReport
  busy: boolean
  onReveal: (path: string) => void
  onOpen: (path: string) => void
  onPurge: (paths: string[], permanent: boolean) => void
  onConfigSaved: (message: string) => void
}

const EDITABLE_EXTENSION = /\.(toml|json5?|jsonc|properties|cfg|conf|hocon|ini|txt)$/i

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
  label: (t: Messages) => string
  hint: (t: Messages) => string
  match: (entry: ConfigEntry) => boolean
}

const QUICK_SELECTS: QuickSelect[] = [
  {
    id: 'orphaned',
    label: (t) => t.configs.presetOrphaned,
    hint: (t) => t.configs.presetOrphanedHint,
    match: (entry) => entry.status === 'orphaned'
  },
  {
    id: 'inactive',
    label: (t) => t.configs.presetInactive,
    hint: (t) => t.configs.presetInactiveHint,
    match: (entry) => entry.status === 'inactive'
  },
  {
    id: 'low-confidence',
    label: (t) => t.configs.presetUncertain,
    hint: (t) => t.configs.presetUncertainHint,
    match: (entry) => entry.confidence > 0 && entry.confidence < LOW_CONFIDENCE
  },
  {
    id: 'backups',
    label: (t) => t.configs.presetBackups,
    hint: (t) => t.configs.presetBackupsHint,
    match: (entry) => BACKUP_SUFFIX.test(entry.relativePath)
  }
]

export function describeConfigReason(reason: ConfigMatchReason, t: Messages): string {
  switch (reason.kind) {
    case 'system':
      return t.configReason.system
    case 'noMods':
      return t.configReason.noMods
    case 'noMatch':
      return t.configReason.noMatch
    case 'exactModId':
      return t.configReason.exactModId(reason.modId)
    case 'namedAfterModId':
      return t.configReason.namedAfterModId(reason.modId)
    case 'normalisedModId':
      return t.configReason.normalisedModId(reason.modId)
    case 'bundledConfig':
      return t.configReason.bundledConfig(reason.modName)
    case 'slug':
      return t.configReason.slug(reason.slug)
    case 'modName':
      return t.configReason.modName(reason.modName)
    case 'fileName':
      return t.configReason.fileName(reason.modName)
    case 'initials':
      return t.configReason.initials(reason.candidate, reason.modName)
    case 'containsModId':
      return t.configReason.containsModId(reason.modId)
    case 'shortenedModId':
      return t.configReason.shortenedModId(reason.modId)
  }
}

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
        <SummaryTile
          label={t.configs.matchedToMod}
          value={String(report.totals.owned)}
          detail={t.configs.configInUse}
        />
        <SummaryTile
          label={t.configs.disabledMod}
          value={String(report.totals.inactive)}
          detail={t.configs.settingsKept}
        />
        <SummaryTile
          label={t.configs.noMatchingMod}
          value={String(report.totals.orphaned)}
          detail={t.configs.reclaimable(formatBytes(report.reclaimableBytes, t))}
        />
        <SummaryTile
          label={t.configs.loaderAndSystem}
          value={String(report.totals.system)}
          detail={t.configs.notOwned}
        />
      </Box>

      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
          {t.configs.quickSelect}
        </Typography>
        {QUICK_SELECTS.map((preset) => {
          const count = report.entries.filter(preset.match).length
          return (
            <Tooltip key={preset.id} title={preset.hint(t)}>
              <span>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={count === 0}
                  onClick={() => applyQuickSelect(preset)}
                >
                  {t.configs.presetWithCount(preset.label(t), count)}
                </Button>
              </span>
            </Tooltip>
          )
        })}
      </Stack>

      <SelectionBar
        count={selected.size}
        size={formatBytes(selectedBytes, t)}
        busy={busy}
        onClear={() => setSelected(new Set())}
        onPurge={() => setConfirming(true)}
      />

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' } }}>
        <TextField
          size="small"
          placeholder={t.configs.searchConfigs}
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
          <ToggleButton value="all">{t.common.all}</ToggleButton>
          <ToggleButton value="owned">{t.configs.filterActive}</ToggleButton>
          <ToggleButton value="inactive">{t.common.disabled}</ToggleButton>
          <ToggleButton value="orphaned">{t.configs.filterUnmatched}</ToggleButton>
          <ToggleButton value="system">{t.configs.filterSystem}</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {visible.length === 0 ? (
        <EmptyState title={t.common.nothingMatches} detail={t.common.tryDifferentSearch} />
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
                    slotProps={{ input: { 'aria-label': t.configs.selectAllShown } }}
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
                  t={t}
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
            {t.configs.modsWithoutConfig(report.modsWithoutConfig.length)}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t.configs.modsWithoutConfigDetail}{' '}
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
        <DialogTitle>{t.configs.purgeTitle(selected.size)}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {t.configs.purgeDetail(formatBytes(selectedBytes, t))}
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
                {t.configs.purgeEntry(entry.relativePath, entry.ownerModName)}
              </Typography>
            ))}
          </Box>
          {selectedEntries.some((entry) => entry.status === 'owned') && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {t.configs.purgeOwnedWarning}
            </Alert>
          )}
        </DialogContent>
        <PurgeActions
          onCancel={() => setConfirming(false)}
          onConfirm={(permanent) => {
            setConfirming(false)
            onPurge(
              selectedEntries.map((entry) => entry.path),
              permanent
            )
          }}
        />
      </Dialog>
    </Stack>
  )
}

interface ConfigRowProps {
  entry: ConfigEntry
  t: Messages
  selected: boolean
  expansion: DirectoryExpansion
  onToggle: () => void
  onReveal: (path: string) => void
  onOpen: (path: string) => void
  onEdit: (path: string) => void
}

function ConfigRow({
  entry,
  t,
  selected,
  expansion,
  onToggle,
  onReveal,
  onOpen,
  onEdit
}: ConfigRowProps) {
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
              aria-label={
                open ? t.common.collapse(entry.relativePath) : t.common.expand(entry.relativePath)
              }
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
                {t.common.fileCount(entry.fileCount)}
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
        <Tooltip title={describeConfigReason(entry.reason, t)}>
          <Box>
            <LinearProgress
              variant="determinate"
              value={Math.round(entry.confidence * 100)}
              color={entry.confidence >= 0.8 ? 'success' : entry.confidence > 0 ? 'warning' : 'inherit'}
              sx={{ opacity: entry.confidence > 0 ? 1 : 0.25 }}
            />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {entry.confidence > 0
                ? t.configs.sure(Math.round(entry.confidence * 100))
                : t.configs.noMatch}
            </Typography>
          </Box>
        </Tooltip>
      </TableCell>
      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
        {formatBytes(entry.sizeBytes, t)}
      </TableCell>
      <TableCell>
        <Chip
          size="small"
          variant="outlined"
          color={STATUS_COLOUR[entry.status]}
          label={t.configStatus[entry.status]}
        />
      </TableCell>
      <TableCell>
        <Stack direction="row">
          {!entry.isDirectory && isEditableConfig(entry.relativePath) && (
            <Tooltip title={t.common.editSettings}>
              <IconButton size="small" onClick={() => onEdit(entry.path)}>
                <TuneRounded fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title={t.common.showInFolder}>
            <IconButton size="small" onClick={() => onReveal(entry.path)}>
              <FolderOpenRounded fontSize="small" />
            </IconButton>
          </Tooltip>
          {!entry.isDirectory && (
            <Tooltip title={t.common.openFile}>
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
            t={t}
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
  t: Messages
  depth: number
  expansion: DirectoryExpansion
  onReveal: (path: string) => void
  onOpen: (path: string) => void
  onEdit: (path: string) => void
}

const CHILD_INDENT = 22

function ConfigChildRow({ node, t, depth, expansion, onReveal, onOpen, onEdit }: ConfigChildRowProps) {
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
                aria-label={open ? t.common.collapse(node.name) : t.common.expand(node.name)}
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
          {formatBytes(node.sizeBytes, t)}
        </TableCell>
        <TableCell />
        <TableCell>
          <Stack direction="row">
            {!node.isDirectory && isEditableConfig(node.name) && (
              <Tooltip title={t.common.editSettings}>
                <IconButton size="small" onClick={() => onEdit(node.path)}>
                  <TuneRounded fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title={t.common.showInFolder}>
              <IconButton size="small" onClick={() => onReveal(node.path)}>
                <FolderOpenRounded fontSize="small" />
              </IconButton>
            </Tooltip>
            {!node.isDirectory && (
              <Tooltip title={t.common.openFile}>
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
            t={t}
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
