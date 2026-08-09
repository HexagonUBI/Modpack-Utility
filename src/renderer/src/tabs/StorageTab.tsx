import { Fragment, useCallback, useMemo, useState } from 'react'
import {
  Box,
  Breadcrumbs,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material'
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded'
import CleaningServicesRounded from '@mui/icons-material/CleaningServicesRounded'
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded'
import FolderOpenRounded from '@mui/icons-material/FolderOpenRounded'
import FolderRounded from '@mui/icons-material/FolderRounded'
import InsertDriveFileOutlined from '@mui/icons-material/InsertDriveFileOutlined'
import StorageRounded from '@mui/icons-material/StorageRounded'
import { DISPOSABLE_CATEGORIES, type SizeNode, type StorageReport } from '@shared/types'
import { formatBytes, formatCount, formatPercent } from '../format'
import { colourForCategory, colourForGroup, groupForCategory, VIZ_GROUP_ORDER, type VizGroup } from '../viz'
import type { ThemeMode } from '../theme'
import Treemap from '../components/Treemap'
import EmptyState from '../components/EmptyState'
import PurgeActions from '../components/PurgeActions'
import { useDirectoryExpansion, useElementSize, type DirectoryExpansion } from '../hooks'
import {
  applyDirection,
  compareFoldersFirst,
  SortHeaderCell,
  useSort
} from '../components/SortableTable'
import { useT, type Messages } from '../i18n'

interface StorageTabProps {
  report: StorageReport | null

  rootLabel: string
  loading: boolean
  busy: boolean
  progress: string | null
  mode: ThemeMode
  onScan: () => void
  onReveal: (path: string) => void
  onPurge: (paths: string[], permanent: boolean) => void
}

export default function StorageTab({
  report,
  rootLabel,
  loading,
  busy,
  progress,
  mode,
  onScan,
  onReveal,
  onPurge
}: StorageTabProps) {
  const t = useT()

  const [trail, setTrail] = useState<SizeNode[]>([])
  const [confirmingCleanup, setConfirmingCleanup] = useState(false)
  const [sizeRef, size] = useElementSize<HTMLDivElement>()
  const expansion = useDirectoryExpansion()

  const sorter = useSort<'name' | 'size' | 'files'>('name', 'asc')

  const compare = useCallback(
    (a: SizeNode, b: SizeNode): number => {
      const { key, direction } = sorter.sort
      const comparison =
        key === 'name'
          ? compareFoldersFirst(a, b)
          : key === 'files'
            ? a.fileCount - b.fileCount
            : a.sizeBytes - b.sizeBytes

      if (comparison !== 0) return applyDirection(comparison, direction)
      return a.name.localeCompare(b.name)
    },
    [sorter.sort]
  )

  const root = report?.root ?? null
  const current = trail.length > 0 ? trail[trail.length - 1]! : root

  const legend = useMemo(() => (root ? buildLegend(root) : []), [root])
  const disposable = useMemo(() => (root ? collectDisposable(root) : []), [root])
  const disposableBytes = disposable.reduce((sum, node) => sum + node.sizeBytes, 0)

  if (loading) {
    return (
      <Stack spacing={2} sx={{ alignItems: 'center', py: 10 }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {progress ?? t.storage.measuringFiles}
        </Typography>
      </Stack>
    )
  }

  if (!report || !root || !current) {
    return (
      <EmptyState
        icon={<StorageRounded sx={{ fontSize: 40, color: 'text.secondary' }} />}
        title={t.storage.measureTitle}
        detail={t.storage.measureDetail}
        action={
          <Button variant="contained" onClick={onScan}>
            {t.storage.measureNow}
          </Button>
        }
      />
    )
  }

  const children = [...(current.children ?? []).filter((child) => child.sizeBytes > 0)].sort(compare)

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h5">{formatBytes(root.sizeBytes, t)}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t.storage.filesMeasuredIn(
              formatCount(report.scannedFiles),
              (report.scannedMs / 1000).toFixed(1)
            )}
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }} />
        <Button size="small" onClick={onScan}>
          {t.storage.reMeasure}
        </Button>
      </Stack>

      {disposable.length > 0 && (
        <Stack
          direction="row"
          spacing={1.5}
          useFlexGap
          sx={{
            alignItems: 'center',
            flexWrap: 'wrap',
            p: 1.5,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1
          }}
        >
          <CleaningServicesRounded fontSize="small" sx={{ color: 'text.secondary' }} />
          <Box sx={{ flex: 1, minWidth: 220 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {t.storage.legendEntry(t.storage.disposable, formatBytes(disposableBytes, t))}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t.storage.disposableHint}
            </Typography>
          </Box>
          <Button
            size="small"
            variant="outlined"
            color="error"
            disabled={busy}
            onClick={() => setConfirmingCleanup(true)}
          >
            {t.storage.clearDisposable}
          </Button>
        </Stack>
      )}

      <Breadcrumbs sx={{ minHeight: 24 }}>
        <Link
          component="button"
          underline="hover"
          color={trail.length === 0 ? 'text.primary' : 'inherit'}
          onClick={() => setTrail([])}
        >
          {rootLabel}
        </Link>
        {trail.map((node, index) => (
          <Link
            key={node.path}
            component="button"
            underline="hover"
            color={index === trail.length - 1 ? 'text.primary' : 'inherit'}
            onClick={() => setTrail(trail.slice(0, index + 1))}
          >
            {node.name}
          </Link>
        ))}
      </Breadcrumbs>

      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        {legend.map((entry) => (
          <Stack key={entry.group} direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '3px',
                backgroundColor: colourForGroup(entry.group, mode),
                flexShrink: 0
              }}
            />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t.storage.legendEntry(t.storageGroups[entry.group], formatBytes(entry.sizeBytes, t))}
            </Typography>
          </Stack>
        ))}
      </Stack>

      {}
      <Box
        ref={sizeRef}
        sx={{
          height: 320,
          borderRadius: 0,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden'
        }}
      >
        {children.length > 0 && size.width > 0 && (
          <Treemap
            node={current}
            width={size.width}
            height={size.height}
            mode={mode}
            onOpen={(node) => {
              if (node.isDirectory && node.children && node.children.length > 0) {
                setTrail([...trail, node])
              } else {
                onReveal(node.path)
              }
            }}
          />
        )}
      </Box>

      {report.truncated && trail.length === 0 && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t.storage.truncatedNote}
        </Typography>
      )}

      <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <SortHeaderCell columnKey="name" sorter={sorter}>
                {t.common.name}
              </SortHeaderCell>
              <SortHeaderCell columnKey="size" sorter={sorter} numeric align="right">
                {t.common.size}
              </SortHeaderCell>
              <TableCell width={140}>{t.storage.share}</TableCell>
              <SortHeaderCell columnKey="files" sorter={sorter} numeric align="right">
                {t.common.files}
              </SortHeaderCell>
              <TableCell width={48} />
            </TableRow>
          </TableHead>
          <TableBody>
            {children.map((child) => (
              <SizeRow
                key={child.path || 'aggregate'}
                node={child}
                t={t}
                expansionKey={child.path || `${current.path}/#aggregate`}
                depth={0}
                total={current.sizeBytes}
                mode={mode}
                expansion={expansion}
                compare={compare}
                onDrillDown={(node) => setTrail([...trail, node])}
                onReveal={onReveal}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={confirmingCleanup}
        onClose={() => setConfirmingCleanup(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t.storage.disposablePurgeTitle(disposable.length)}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {t.storage.disposablePurgeDetail(formatBytes(disposableBytes, t))}
          </DialogContentText>
          {disposable.map((node) => (
            <Typography key={node.path} variant="body2" sx={{ fontFamily: 'ui-monospace, monospace' }}>
              {t.storage.legendEntry(node.name, formatBytes(node.sizeBytes, t))}
            </Typography>
          ))}
        </DialogContent>
        <PurgeActions
          onCancel={() => setConfirmingCleanup(false)}
          onConfirm={(permanent) => {
            setConfirmingCleanup(false)
            onPurge(
              disposable.map((node) => node.path),
              permanent
            )
          }}
        />
      </Dialog>
    </Stack>
  )
}

function collectDisposable(root: SizeNode): SizeNode[] {
  return (root.children ?? [])
    .filter(
      (child) =>
        child.path !== '' &&
        child.sizeBytes > 0 &&
        DISPOSABLE_CATEGORIES.includes(child.category)
    )
    .sort((a, b) => b.sizeBytes - a.sizeBytes)
}

interface SizeRowProps {
  node: SizeNode
  t: Messages

  expansionKey: string
  depth: number
  total: number
  mode: ThemeMode
  expansion: DirectoryExpansion
  compare: (a: SizeNode, b: SizeNode) => number
  onDrillDown: (node: SizeNode) => void
  onReveal: (path: string) => void
}

const INDENT_PER_LEVEL = 20
const MAX_INLINE_CHILDREN = 200

function SizeRow({
  node,
  t,
  expansionKey,
  depth,
  total,
  mode,
  expansion,
  compare,
  onDrillDown,
  onReveal
}: SizeRowProps) {
  const label = node.aggregatedCount === null ? node.name : t.storage.smallerItems(node.aggregatedCount)
  const expandable = node.isDirectory && (node.path !== '' || (node.children?.length ?? 0) > 0)
  const open = expansion.isExpanded(expansionKey)
  const loading = expansion.isLoading(expansionKey)
  const raw = open ? expansion.childrenOf(expansionKey, node.children) : null
  const children = raw === null ? null : [...raw].sort(compare)

  return (
    <Fragment>
      <TableRow hover>
        <TableCell>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', pl: `${depth * INDENT_PER_LEVEL}px` }}>
            {expandable ? (
              <IconButton
                size="small"
                aria-label={open ? t.common.collapse(label) : t.common.expand(label)}
                onClick={() => expansion.toggle(expansionKey, node.children)}
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
            <Typography
              variant="body2"
              sx={{ ml: 0.5, color: node.aggregatedCount === null ? undefined : 'text.secondary' }}
            >
              {label}
            </Typography>
          </Stack>
        </TableCell>
        <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatBytes(node.sizeBytes, t)}
        </TableCell>
        <TableCell>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Box
              sx={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: 'action.hover', overflow: 'hidden' }}
            >
              <Box
                sx={{
                  width: `${Math.max(1, (node.sizeBytes / Math.max(1, total)) * 100)}%`,
                  height: '100%',
                  borderRadius: 3,
                  backgroundColor: colourForCategory(node.category, mode)
                }}
              />
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
              {formatPercent(node.sizeBytes, total)}
            </Typography>
          </Stack>
        </TableCell>
        <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatCount(node.fileCount)}
        </TableCell>
        <TableCell>
          <Stack direction="row">
            {node.isDirectory && node.path !== '' && node.children && node.children.length > 0 && depth === 0 && (
              <Tooltip title={t.storage.openAsOwnView}>
                <IconButton size="small" onClick={() => onDrillDown(node)}>
                  <ChevronRightRounded fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {node.path && (
              <Tooltip title={t.common.showInFolder}>
                <IconButton size="small" onClick={() => onReveal(node.path)}>
                  <FolderOpenRounded fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </TableCell>
      </TableRow>

      {open &&
        children?.slice(0, MAX_INLINE_CHILDREN).map((child) => (
          <SizeRow
            key={child.path || `${expansionKey}/aggregate`}

            node={{ ...child, category: node.category }}
            t={t}
            expansionKey={child.path || `${expansionKey}/#aggregate`}
            depth={depth + 1}
            total={total}
            mode={mode}
            expansion={expansion}
            compare={compare}
            onDrillDown={onDrillDown}
            onReveal={onReveal}
          />
        ))}

      {open && children && children.length > MAX_INLINE_CHILDREN && (
        <TableRow>
          <TableCell colSpan={5} sx={{ pl: `${(depth + 1) * INDENT_PER_LEVEL + 30}px` }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t.storage.moreItems(children.length - MAX_INLINE_CHILDREN)}
            </Typography>
          </TableCell>
        </TableRow>
      )}
    </Fragment>
  )
}

interface LegendEntry {
  group: VizGroup
  sizeBytes: number
}

function buildLegend(root: SizeNode): LegendEntry[] {
  const totals = new Map<VizGroup, number>()

  for (const child of root.children ?? []) {
    const group = groupForCategory(child.category)
    totals.set(group, (totals.get(group) ?? 0) + child.sizeBytes)
  }

  return VIZ_GROUP_ORDER.filter((group) => (totals.get(group) ?? 0) > 0).map((group) => ({
    group,
    sizeBytes: totals.get(group) ?? 0
  }))
}
