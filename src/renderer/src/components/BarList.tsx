import { Box, Stack, Typography } from '@mui/material'

export interface BarDatum {
  key: string
  label: string
  value: number
  colour: string
}

interface BarListProps {
  data: BarDatum[]

  unit?: string
  onSelect?: (datum: BarDatum) => void
}

const BAR_HEIGHT = 10

export default function BarList({ data, unit, onSelect }: BarListProps) {
  const max = Math.max(...data.map((datum) => datum.value), 1)

  return (
    <Stack spacing={1.25}>
      {data.map((datum) => (
        <Box
          key={datum.key}
          onClick={() => onSelect?.(datum)}
          sx={{ cursor: onSelect ? 'pointer' : 'default' }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', mb: 0.375 }}>
            <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>
              {datum.label}
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}
            >
              {datum.value}
              {unit ? ` ${unit}` : ''}
            </Typography>
          </Stack>
          <Box
            sx={{
              height: BAR_HEIGHT,
              borderRadius: '2px',
              backgroundColor: 'action.hover',
              overflow: 'hidden'
            }}
          >
            <Box
              sx={{
                width: `${Math.max(2, (datum.value / max) * 100)}%`,
                height: '100%',

                borderRadius: '0 4px 4px 0',
                backgroundColor: datum.colour
              }}
            />
          </Box>
        </Box>
      ))}
    </Stack>
  )
}
