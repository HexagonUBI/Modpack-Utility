import { Box, Stack, Typography } from '@mui/material'
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded'
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded'
import InfoOutlined from '@mui/icons-material/InfoOutlined'
import ReportProblemOutlined from '@mui/icons-material/ReportProblemOutlined'
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded'
import type { Insight, InsightSeverity } from '../insights'

const SEVERITY: Record<InsightSeverity, { colour: string; label: string; Icon: typeof InfoOutlined }> = {
  critical: { colour: '#d03b3b', label: 'Critical', Icon: ErrorOutlineRounded },
  serious: { colour: '#ec835a', label: 'Needs attention', Icon: ReportProblemOutlined },
  warning: { colour: '#fab219', label: 'Worth checking', Icon: WarningAmberRounded },
  good: { colour: '#0ca30c', label: 'Looking good', Icon: CheckCircleOutlineRounded },
  info: { colour: '#898781', label: 'Note', Icon: InfoOutlined }
}

interface InsightCardProps {
  insight: Insight

  onOpen?: () => void
}

export default function InsightCard({ insight, onOpen }: InsightCardProps) {
  const { colour, label, Icon } = SEVERITY[insight.severity]
  const clickable = onOpen !== undefined

  return (
    <Box
      onClick={onOpen}
      sx={{
        display: 'flex',
        gap: 1.5,
        p: 1.75,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',

        borderLeft: `4px solid ${colour}`,
        cursor: clickable ? 'pointer' : 'default',
        '&:hover': clickable ? { backgroundColor: 'action.hover' } : undefined
      }}
    >
      <Icon sx={{ color: colour, fontSize: 22, mt: '1px', flexShrink: 0 }} />
      <Stack spacing={0.5} sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
          <Typography variant="subtitle2">{insight.title}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            {label}
          </Typography>
        </Stack>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {insight.detail}
        </Typography>
      </Stack>
    </Box>
  )
}
