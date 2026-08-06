import { Fragment, useCallback, useMemo, useState } from 'react'
import {
  Box,
  Breadcrumbs,
  Button,
  CircularProgress,
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
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded'
import FolderOpenRounded from '@mui/icons-material/FolderOpenRounded'
import FolderRounded from '@mui/icons-material/FolderRounded'
import InsertDriveFileOutlined from '@mui/icons-material/InsertDriveFileOutlined'
import StorageRounded from '@mui/icons-material/StorageRounded'
import type { SizeNode, StorageReport } from '@shared/types'
import { formatBytes, formatCount, formatPercent } from '../format'
import { colourForCategory, colourForGroup, groupForCategory, VIZ_GROUP_LABELS, VIZ_GROUP_ORDER, type VizGroup } from '../viz'
import type { ThemeMode } from '../theme'
import Treemap from '../components/Treemap'
import EmptyState from '../components/EmptyState'
import { useDirectoryExpansion, useElementSize, type DirectoryExpansion } from '../hooks'
import {
  applyDirection,
  compareFoldersFirst,
  SortHeaderCell,
  useSort
} from '../components/SortableTable'
import { useT } from '../i18n'

interface StorageTabProps {
  report: StorageReport | null

  rootLabel: string
  loading: boolean
  progress: string | null
  mode: ThemeMode
  onScan: () => void
  onReveal: (path: string) => void
}

export default function StorageTab({
  report,
  rootLabel,
  loading,
  progress,
  mode,
  onScan,
  onReveal
}: StorageTabProps) {
  const t = useT()

  const [trail, setTrail] = useState<SizeNode[]>([])
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

  if (loading) {
    return (
      <Stack spacing={2} sx={{ alignItems: 'center', py: 10 }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {progress ?? 'Measuring files...'}
        </Typography>
      </Stack>
    )
  }

  if (!report || !root || !current) {
    return (
      <EmptyState
        icon={<StorageRounded sx={{ fontSize: 40, color: 'text.secondary' }} />}
        title="Measure this instance"
        detail="Walks every file to show exactly where the space went, the way WizTree does. Large instances with big worlds can take a few seconds."
        action={
          <Button variant="contained" onClick={onScan}>
            Measure now
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
          <Typography variant="h5">{formatBytes(root.sizeBytes)}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {formatCount(report.scannedFiles)} files measured in {(report.scannedMs / 1000).toFixed(1)}s
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }} />
        <Button size="small" onClick={onScan}>
          Re-measure
        </Button>
      </Stack>

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
              {VIZ_GROUP_LABELS[entry.group]} - {formatBytes(entry.sizeBytes)}
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
          Very deep or very wide folders are grouped for display. All sizes shown are exact totals.
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
                key={child.path || child.name}
                node={child}
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
    </Stack>
  )
}

interface SizeRowProps {
  node: SizeNode
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

function SizeRow({ node, depth, total, mode, expansion, compare, onDrillDown, onReveal }: SizeRowProps) {
  const expandable = node.isDirectory && node.path !== ''
  const open = expansion.isExpanded(node.path)
  const loading = expansion.isLoading(node.path)
  const raw = open ? expansion.childrenOf(node.path, node.children) : null
  const children = raw === null ? null : [...raw].sort(compare)

  return (
    <Fragment>
      <TableRow hover>
        <TableCell>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', pl: `${depth * INDENT_PER_LEVEL}px` }}>
            {expandable ? (
              <IconButton
                size="small"
                aria-label={open ? `Collapse ${node.name}` : `Expand ${node.name}`}
                onClick={() => expansion.toggle(node.path, node.children)}
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
            <Typography variant="body2" sx={{ ml: 0.5 }}>
              {node.name}
            </Typography>
          </Stack>
        </TableCell>
        <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatBytes(node.sizeBytes)}
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
            {node.isDirectory && node.children && node.children.length > 0 && depth === 0 && (
              <Tooltip title="Open as its own view">
                <IconButton size="small" onClick={() => onDrillDown(node)}>
                  <ChevronRightRounded fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {node.path && (
              <Tooltip title="Show in folder">
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
            key={child.path || `${node.path}/${child.name}`}

            node={{ ...child, category: node.category }}
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
              {children.length - MAX_INLINE_CHILDREN} more items not shown. Use Show in folder to see them
              all.
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
