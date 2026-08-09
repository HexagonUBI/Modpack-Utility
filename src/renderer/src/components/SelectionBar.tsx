import { Button, Paper, Stack, Typography } from '@mui/material'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import { useT } from '../i18n'
import { useDeleteMode } from '../deleteMode'

interface SelectionBarProps {
  count: number
  size: string
  busy: boolean
  onClear: () => void
  onPurge: () => void
}

export default function SelectionBar({ count, size, busy, onClear, onPurge }: SelectionBarProps) {
  const t = useT()
  const mode = useDeleteMode()
  if (count === 0) return null

  return (
    <Paper
      elevation={0}
      sx={{
        position: 'sticky',
        top: -20,
        zIndex: 3,
        mx: -3,
        px: 3,
        py: 1.25,
        borderRadius: 0,
        borderBottom: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper'
      }}
    >
      <Stack
        direction="row"
        spacing={1.5}
        useFlexGap
        sx={{ alignItems: 'center', flexWrap: 'wrap' }}
      >
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {t.common.selected(count, size)}
        </Typography>
        <Button size="small" onClick={onClear}>
          {t.common.clearSelection}
        </Button>
        <Stack sx={{ flex: 1 }} />
        <Button
          color="error"
          size="small"
          variant="contained"
          startIcon={<DeleteOutlineRounded />}
          disabled={busy}
          onClick={onPurge}
        >
          {mode === 'ask' ? t.common.deleteChoose : t.common.moveToRecycleBin}
        </Button>
      </Stack>
    </Paper>
  )
}
