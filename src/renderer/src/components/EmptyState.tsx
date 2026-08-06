import { Box, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  detail: string
  action?: ReactNode
  icon?: ReactNode
}

export default function EmptyState({ title, detail, action, icon }: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        px: 3,
        py: 8
      }}
    >
      <Stack spacing={1.5} sx={{ alignItems: 'center', maxWidth: 460 }}>
        {icon}
        <Typography variant="h6">{title}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {detail}
        </Typography>
        {action}
      </Stack>
    </Box>
  )
}
