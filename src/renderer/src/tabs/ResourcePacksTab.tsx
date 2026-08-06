import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Stack,
  Switch,
  Tooltip,
  Typography
} from '@mui/material'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import FolderOpenRounded from '@mui/icons-material/FolderOpenRounded'
import ImageOutlined from '@mui/icons-material/ImageOutlined'
import type { ResourcePackEntry, ResourcePackReport } from '@shared/types'
import { formatBytes } from '../format'
import EmptyState from '../components/EmptyState'

interface ResourcePacksTabProps {
  report: ResourcePackReport
  busy: boolean
  onReveal: (path: string) => void
  onPurge: (paths: string[]) => void
  onToggleEnabled: (name: string, enabled: boolean) => void
}

export default function ResourcePacksTab({
  report,
  busy,
  onReveal,
  onPurge,
  onToggleEnabled
}: ResourcePacksTabProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirming, setConfirming] = useState(false)

  useEffect(() => setSelected(new Set()), [report.dir, report.packs.length])

  const selectedPacks = useMemo(
    () => report.packs.filter((pack) => selected.has(pack.path)),
    [report.packs, selected]
  )
  const selectedBytes = selectedPacks.reduce((sum, pack) => sum + pack.sizeBytes, 0)
  const inactive = report.packs.filter((pack) => !pack.enabled)

  if (!report.exists) {
    return (
      <EmptyState
        icon={<ImageOutlined sx={{ fontSize: 40, color: 'text.secondary' }} />}
        title="No resource packs folder"
        detail="This instance has no resourcepacks directory yet."
      />
    )
  }

  if (report.packs.length === 0) {
    return (
      <EmptyState
        icon={<ImageOutlined sx={{ fontSize: 40, color: 'text.secondary' }} />}
        title="No resource packs installed"
        detail="Packs you add to the instance will be listed here with their size and load order."
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
        <SummaryTile label="Installed" value={String(report.packs.length)} detail="packs on disk" />
        <SummaryTile
          label="Active"
          value={String(report.packs.length - inactive.length)}
          detail={`${formatBytes(report.enabledBytes)} loaded`}
        />
        <SummaryTile
          label="Not in use"
          value={String(inactive.length)}
          detail={`${formatBytes(report.totalBytes - report.enabledBytes)} idle`}
        />
        <SummaryTile label="Total size" value={formatBytes(report.totalBytes)} detail="whole folder" />
      </Box>

      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
        <Button
          size="small"
          variant="outlined"
          disabled={inactive.length === 0}
          onClick={() => setSelected(new Set(inactive.map((pack) => pack.path)))}
        >
          Select inactive ({inactive.length})
        </Button>
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

      <Stack spacing={1}>
        {report.packs.map((pack) => (
          <PackRow
            key={pack.path}
            pack={pack}
            selected={selected.has(pack.path)}
            busy={busy}
            onToggle={() => toggle(pack.path)}
            onToggleEnabled={onToggleEnabled}
            onReveal={onReveal}
          />
        ))}
      </Stack>

      <Dialog open={confirming} onClose={() => setConfirming(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Move {selected.size} resource packs to the recycle bin?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            This frees {formatBytes(selectedBytes)}. Nothing is deleted permanently.
          </DialogContentText>
          {selectedPacks.map((pack) => (
            <Typography key={pack.path} variant="body2" sx={{ fontFamily: 'ui-monospace, monospace' }}>
              {pack.name}
              {pack.enabled ? '  (currently active)' : ''}
            </Typography>
          ))}
          {selectedPacks.some((pack) => pack.enabled) && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Some of these are active in the game right now. Removing them changes how the instance looks.
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
              onPurge(selectedPacks.map((pack) => pack.path))
            }}
          >
            Move to recycle bin
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

interface PackRowProps {
  pack: ResourcePackEntry
  selected: boolean
  busy: boolean
  onToggle: () => void
  onToggleEnabled: (name: string, enabled: boolean) => void
  onReveal: (path: string) => void
}

function PackRow({ pack, selected, busy, onToggle, onToggleEnabled, onReveal }: PackRowProps) {
  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{
        alignItems: 'center',
        p: 1.25,
        border: '1px solid',
        borderColor: selected ? 'primary.main' : 'divider',
        borderRadius: 1,
        backgroundColor: selected ? 'action.selected' : undefined
      }}
    >
      <Checkbox checked={selected} onChange={onToggle} slotProps={{ input: { 'aria-label': pack.name } }} />

      <Avatar
        variant="rounded"
        src={pack.iconDataUrl ?? undefined}
        sx={{ width: 42, height: 42, bgcolor: 'action.hover', borderRadius: 1 }}
      >
        <ImageOutlined fontSize="small" />
      </Avatar>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {pack.name}
          </Typography>
          {pack.enabled ? (
            <Chip size="small" color="success" variant="outlined" label={`Active #${(pack.order ?? 0) + 1}`} />
          ) : (
            <Chip size="small" variant="outlined" label="Not in use" />
          )}
          {pack.isDirectory && <Chip size="small" variant="outlined" label="Folder" />}
        </Stack>
        {pack.description && (
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            {pack.description}
          </Typography>
        )}
      </Box>

      <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.secondary' }}>
        {formatBytes(pack.sizeBytes)}
      </Typography>

      {}
      <Tooltip title={pack.enabled ? 'Turn off in game' : 'Turn on in game'}>
        <Switch
          size="small"
          checked={pack.enabled}
          disabled={busy}
          onChange={(event) => onToggleEnabled(pack.name, event.target.checked)}
          slotProps={{ input: { 'aria-label': `Enable ${pack.name}` } }}
        />
      </Tooltip>

      <Tooltip title="Show in folder">
        <IconButton size="small" onClick={() => onReveal(pack.path)}>
          <FolderOpenRounded fontSize="small" />
        </IconButton>
      </Tooltip>
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
