import { Box, Stack, Typography } from '@mui/material'

interface StatTileProps {
  label: string
  value: string
  hint?: string
  accent?: string
}

export default function StatTile({ label, value, hint, accent }: StatTileProps) {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        minWidth: 0
      }}
    >
      <Stack spacing={0.25}>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
          {label}
        </Typography>
        <Typography variant="h5" sx={{ color: accent ?? 'text.primary', lineHeight: 1.2 }}>
          {value}
        </Typography>
        {hint && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {hint}
          </Typography>
        )}
      </Stack>
    </Box>
  )
}
