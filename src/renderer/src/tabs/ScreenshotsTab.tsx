import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography
} from '@mui/material'
import PhotoLibraryOutlined from '@mui/icons-material/PhotoLibraryOutlined'
import type { ScreenshotEntry, ScreenshotReport } from '@shared/types'
import { formatBytes, formatDate } from '../format'
import EmptyState from '../components/EmptyState'
import SelectionBar from '../components/SelectionBar'
import PurgeActions from '../components/PurgeActions'
import { useT, type Messages } from '../i18n'

type SortKey = 'newest' | 'oldest' | 'largest'

interface ScreenshotsTabProps {
  report: ScreenshotReport
  busy: boolean
  onOpen: (path: string) => void
  onReveal: (path: string) => void
  onPurge: (paths: string[], permanent: boolean) => void
}

const PAGE_SIZE = 60
const SIX_MONTHS_MS = 182 * 24 * 60 * 60 * 1000
const LARGE_SCREENSHOT_BYTES = 4 * 1024 * 1024

export default function ScreenshotsTab({ report, busy, onOpen, onReveal, onPurge }: ScreenshotsTabProps) {
  const t = useT()
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
        title={t.screenshots.none}
        detail={t.screenshots.noneDetail}
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
        <SummaryTile
          label={t.screenshots.count}
          value={String(report.screenshots.length)}
          detail={t.screenshots.inThisInstance}
        />
        <SummaryTile
          label={t.screenshots.totalSize}
          value={formatBytes(report.totalBytes, t)}
          detail={t.screenshots.wholeFolder}
        />
        <SummaryTile
          label={t.screenshots.olderThanSixMonths}
          value={String(old.length)}
          detail={formatBytes(
            old.reduce((sum, shot) => sum + shot.sizeBytes, 0),
            t
          )}
        />
      </Box>

      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
        <Button
          size="small"
          variant="outlined"
          disabled={old.length === 0}
          onClick={() => setSelected(new Set(old.map((shot) => shot.path)))}
        >
          {t.screenshots.selectOld(old.length)}
        </Button>
        <Button
          size="small"
          variant="outlined"
          disabled={large.length === 0}
          onClick={() => setSelected(new Set(large.map((shot) => shot.path)))}
        >
          {t.screenshots.selectLarge(large.length)}
        </Button>
        <Box sx={{ flex: 1 }} />
        <ToggleButtonGroup
          size="small"
          exclusive
          value={sort}
          onChange={(_event, next: SortKey | null) => next && setSort(next)}
        >
          <ToggleButton value="newest">{t.screenshots.newest}</ToggleButton>
          <ToggleButton value="oldest">{t.screenshots.oldest}</ToggleButton>
          <ToggleButton value="largest">{t.screenshots.largest}</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <SelectionBar
        count={selected.size}
        size={formatBytes(selectedBytes, t)}
        busy={busy}
        onClear={() => setSelected(new Set())}
        onPurge={() => setConfirming(true)}
      />

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
            t={t}
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
          {t.common.showMore(ordered.length - shown)}
        </Button>
      )}

      <Dialog open={confirming} onClose={() => setConfirming(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t.screenshots.purgeTitle(selected.size)}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t.screenshots.purgeDetail(formatBytes(selectedBytes, t))}
          </DialogContentText>
        </DialogContent>
        <PurgeActions
          onCancel={() => setConfirming(false)}
          onConfirm={(permanent) => {
            setConfirming(false)
            onPurge(
              selectedShots.map((shot) => shot.path),
              permanent
            )
          }}
        />
      </Dialog>
    </Stack>
  )
}

interface ScreenshotCardProps {
  shot: ScreenshotEntry
  t: Messages
  thumbnail: string | null
  selected: boolean
  onToggle: () => void
  onOpen: (path: string) => void
  onReveal: (path: string) => void
}

function ScreenshotCard({
  shot,
  t,
  thumbnail,
  selected,
  onToggle,
  onOpen,
  onReveal
}: ScreenshotCardProps) {
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
        slotProps={{ input: { 'aria-label': t.screenshots.selectOne(shot.name) } }}
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

      <Tooltip title={t.screenshots.openFullSize}>
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
            {formatDate(new Date(shot.modifiedMs).toISOString(), t)}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', cursor: 'pointer' }}
            onClick={() => onReveal(shot.path)}
          >
            {formatBytes(shot.sizeBytes, t)}
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
