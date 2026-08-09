import { Button, DialogActions } from '@mui/material'
import DeleteForeverRounded from '@mui/icons-material/DeleteForeverRounded'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import { useDeleteMode } from '../deleteMode'
import { useT } from '../i18n'

interface PurgeActionsProps {
  onCancel: () => void
  onConfirm: (permanent: boolean) => void
}

export default function PurgeActions({ onCancel, onConfirm }: PurgeActionsProps) {
  const t = useT()
  const mode = useDeleteMode()

  return (
    <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
      <Button onClick={onCancel}>{t.common.cancel}</Button>
      {mode === 'ask' && (
        <Button
          color="error"
          startIcon={<DeleteForeverRounded />}
          onClick={() => onConfirm(true)}
        >
          {t.common.deletePermanently}
        </Button>
      )}
      <Button
        color={mode === 'ask' ? 'primary' : 'error'}
        variant="contained"
        startIcon={<DeleteOutlineRounded />}
        onClick={() => onConfirm(false)}
      >
        {t.common.moveToRecycleBin}
      </Button>
    </DialogActions>
  )
}
