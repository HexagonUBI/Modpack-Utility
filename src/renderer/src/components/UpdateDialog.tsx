import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Stack,
  Typography
} from '@mui/material'
import DownloadRounded from '@mui/icons-material/DownloadRounded'
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded'
import type {
  ReleaseInfo,
  UpdateChannel,
  UpdateErrorCode,
  UpdateProgress
} from '@shared/types'
import { formatBytes, formatDate, formatPercent } from '../format'
import { useT } from '../i18n'
import ReleaseNotes from './ReleaseNotes'

export type UpdateDialogMode = 'update' | 'changelog'

interface UpdateDialogProps {
  open: boolean
  mode: UpdateDialogMode
  release: ReleaseInfo | null
  channel: UpdateChannel
  progress: UpdateProgress | null
  error: UpdateErrorCode | null
  onInstall: () => void
  onClose: () => void
}

export default function UpdateDialog({
  open,
  mode,
  release,
  channel,
  progress,
  error,
  onInstall,
  onClose
}: UpdateDialogProps) {
  const t = useT()
  if (!release) return null

  const busy = progress !== null
  const canInstall = mode === 'update' && channel === 'installer' && release.downloadUrl !== null

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { sx: { maxHeight: '82vh' } } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        {mode === 'update' ? t.updates.dialogTitle(release.version) : t.updates.changelogTitle(release.version)}
      </DialogTitle>

      <DialogContent dividers>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', mb: 1.5 }}>
          {release.title && release.title !== release.version && (
            <Chip size="small" label={release.title} />
          )}
          {release.publishedIso && (
            <Chip
              size="small"
              variant="outlined"
              label={t.updates.released(formatDate(release.publishedIso, t))}
            />
          )}
          {mode === 'update' && release.downloadSizeBytes !== null && (
            <Chip
              size="small"
              variant="outlined"
              label={t.updates.downloadSize(formatBytes(release.downloadSizeBytes, t))}
            />
          )}
        </Stack>

        <ReleaseNotes text={release.notes} empty={t.updates.noNotes} />

        {mode === 'update' && channel === 'portable' && (
          <Alert severity="info" sx={{ mt: 2 }}>
            {t.updates.portableHint}
          </Alert>
        )}

        {mode === 'update' && channel === 'development' && (
          <Alert severity="info" sx={{ mt: 2 }}>
            {t.updates.devHint}
          </Alert>
        )}

        {error !== null && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {t.updates.errors[error]}
          </Alert>
        )}

        {canInstall && !busy && error === null && (
          <Typography variant="caption" sx={{ display: 'block', mt: 2, color: 'text.secondary' }}>
            {t.updates.installHint}
          </Typography>
        )}

        {busy && (
          <Stack spacing={0.75} sx={{ mt: 2 }}>
            <Typography variant="body2">{describe(progress, t)}</Typography>
            <LinearProgress
              variant={
                progress.phase === 'downloading' && progress.totalBytes > 0
                  ? 'determinate'
                  : 'indeterminate'
              }
              value={
                progress.phase === 'downloading' && progress.totalBytes > 0
                  ? Math.round((progress.receivedBytes / progress.totalBytes) * 100)
                  : undefined
              }
            />
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Button
          startIcon={<OpenInNewRounded />}
          disabled={busy}
          onClick={() => void window.api.openExternal(release.htmlUrl)}
        >
          {t.updates.openRelease}
        </Button>
        <Button disabled={busy} onClick={onClose}>
          {mode === 'update' && canInstall ? t.updates.later : t.common.close}
        </Button>
        {canInstall && (
          <Button variant="contained" startIcon={<DownloadRounded />} disabled={busy} onClick={onInstall}>
            {t.updates.install}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

function describe(progress: UpdateProgress, t: ReturnType<typeof useT>): string {
  switch (progress.phase) {
    case 'checking':
      return t.updates.checking
    case 'downloading':
      return t.updates.downloading(
        progress.totalBytes > 0 ? formatPercent(progress.receivedBytes, progress.totalBytes) : ''
      )
    case 'verifying':
      return t.updates.verifying
    case 'restarting':
      return t.updates.restarting
  }
}
