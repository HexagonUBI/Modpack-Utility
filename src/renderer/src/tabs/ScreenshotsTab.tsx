import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography
} from '@mui/material'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import PhotoLibraryOutlined from '@mui/icons-material/PhotoLibraryOutlined'
import type { ScreenshotEntry, ScreenshotReport } from '@shared/types'
import { formatBytes, formatDate } from '../format'
import EmptyState from '../components/EmptyState'

type SortKey = 'newest' | 'oldest' | 'largest'

interface ScreenshotsTabProps {
  report: ScreenshotReport
  busy: boolean
  onOpen: (path: string) => void
  onReveal: (path: string) => void
  onPurge: (paths: string[]) => void
}

const PAGE_SIZE = 60
const SIX_MONTHS_MS = 182 * 24 * 60 * 60 * 1000
const LARGE_SCREENSHOT_BYTES = 4 * 1024 * 1024

export default function ScreenshotsTab({ report, busy, onOpen, onReveal, onPurge }: ScreenshotsTabProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sort, setSort] = useState<SortKey>('newest')
  const [shown, setShown] = useState(PAGE_SIZE)
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({})
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    setSelected(new Set())
    setShown(PAGE_SIZE)
    setThumbnails({})
  }, [report.dir, report.screenshots.length])

  const ordered = useMemo(() => {
    const list = [...report.screenshots]
    switch (sort) {
      case 'oldest':
        return list.sort((a, b) => a.modifiedMs - b.modifiedMs)
      case 'largest':
        return list.sort((a, b) => b.sizeBytes - a.sizeBytes)
      default:
        return list.sort((a, b) => b.modifiedMs - a.modifiedMs)
    }
  }, [report.screenshots, sort])

  const visible = ordered.slice(0, shown)

  useEffect(() => {
    const missing = visible.filter((shot) => !(shot.path in thumbnails)).map((shot) => shot.path)
    if (missing.length === 0) return

    let cancelled = false
    void window.api.thumbnails(missing).then((batch) => {
      if (!cancelled) setThumbnails((current) => ({ ...current, ...batch }))
    })
    return () => {
      cancelled = true
    }
  }, [visible, thumbnails])

  const selectedShots = useMemo(
    () => report.screenshots.filter((shot) => selected.has(shot.path)),
    [report.screenshots, selected]
  )
  const selectedBytes = selectedShots.reduce((sum, shot) => sum + shot.sizeBytes, 0)

  const old = report.screenshots.filter((shot) => Date.now() - shot.modifiedMs > SIX_MONTHS_MS)
  const large = report.screenshots.filter((shot) => shot.sizeBytes > LARGE_SCREENSHOT_BYTES)

  if (!report.exists || report.screenshots.length === 0) {
    return (
      <EmptyState
        icon={<PhotoLibraryOutlined sx={{ fontSize: 40, color: 'text.secondary' }} />}
        title="No screenshots"
        detail="Screenshots taken in this instance will show up here, with sizes and bulk cleanup."
      />
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

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
        <SummaryTile label="Screenshots" value={String(report.screenshots.length)} detail="in this instance" />
        <SummaryTile label="Total size" value={formatBytes(report.totalBytes)} detail="whole folder" />
        <SummaryTile
          label="Older than 6 months"
          value={String(old.length)}
          detail={formatBytes(old.reduce((sum, shot) => sum + shot.sizeBytes, 0))}
        />
      </Box>

      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
        <Button
          size="small"
          variant="outlined"
          disabled={old.length === 0}
          onClick={() => setSelected(new Set(old.map((shot) => shot.path)))}
        >
          Select older than 6 months ({old.length})
        </Button>
        <Button
          size="small"
          variant="outlined"
          disabled={large.length === 0}
          onClick={() => setSelected(new Set(large.map((shot) => shot.path)))}
        >
          Select over 4 MB ({large.length})
        </Button>
        {selected.size > 0 && (
          <Button size="small" onClick={() => setSelected(new Set())}>
            Clear selection
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        <ToggleButtonGroup
          size="small"
          exclusive
          value={sort}
          onChange={(_event, next: SortKey | null) => next && setSort(next)}
        >
          <ToggleButton value="newest">Newest</ToggleButton>
          <ToggleButton value="oldest">Oldest</ToggleButton>
          <ToggleButton value="largest">Largest</ToggleButton>
        </ToggleButtonGroup>
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

      <Box
        sx={{
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))'
        }}
      >
        {visible.map((shot) => (
          <ScreenshotCard
            key={shot.path}
            shot={shot}
            thumbnail={thumbnails[shot.path] ?? null}
            selected={selected.has(shot.path)}
            onToggle={() => toggle(shot.path)}
            onOpen={onOpen}
            onReveal={onReveal}
          />
        ))}
      </Box>

      {shown < ordered.length && (
        <Button onClick={() => setShown((current) => current + PAGE_SIZE)}>
          Show more ({ordered.length - shown} remaining)
        </Button>
      )}

      <Dialog open={confirming} onClose={() => setConfirming(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Move {selected.size} screenshots to the recycle bin?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This frees {formatBytes(selectedBytes)}. Nothing is deleted permanently, so you can restore them
            from the recycle bin.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirming(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              setConfirming(false)
              onPurge(selectedShots.map((shot) => shot.path))
            }}
          >
            Move to recycle bin
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

interface ScreenshotCardProps {
  shot: ScreenshotEntry
  thumbnail: string | null
  selected: boolean
  onToggle: () => void
  onOpen: (path: string) => void
  onReveal: (path: string) => void
}

function ScreenshotCard({ shot, thumbnail, selected, onToggle, onOpen, onReveal }: ScreenshotCardProps) {
  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: selected ? 'primary.main' : 'divider',
        borderRadius: 1,
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <Checkbox
        checked={selected}
        onChange={onToggle}
        slotProps={{ input: { 'aria-label': `Select ${shot.name}` } }}
        sx={{
          position: 'absolute',
          top: 2,
          left: 2,
          zIndex: 1,
          backgroundColor: 'rgba(0,0,0,0.35)',
          borderRadius: 1,
          color: '#ffffff',
          '&.Mui-checked': { color: '#ffffff' }
        }}
      />

      <Tooltip title="Open full size">
        <Box
          onClick={() => onOpen(shot.path)}
          sx={{
            height: 120,
            cursor: 'pointer',
            backgroundColor: 'action.hover',
            backgroundImage: thumbnail ? `url(${thumbnail})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
      </Tooltip>

      <Stack spacing={0.25} sx={{ p: 1 }}>
        <Typography variant="caption" noWrap sx={{ fontWeight: 500 }}>
          {shot.name}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {formatDate(new Date(shot.modifiedMs).toISOString())}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', cursor: 'pointer' }}
            onClick={() => onReveal(shot.path)}
          >
            {formatBytes(shot.sizeBytes)}
          </Typography>
        </Stack>
      </Stack>
    </Box>
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
