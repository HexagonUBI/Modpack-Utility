import { Box, Tooltip } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { formatPercent } from '../format'

export interface DonutSlice {
  key: string
  label: string
  value: number
  colour: string
  detail?: string
}

interface DonutProps {
  slices: DonutSlice[]
  size: number

  thickness?: number
  centreValue: string
  centreLabel: string
  onSelect?: (slice: DonutSlice) => void
}

const GAP_DEGREES = 1.4
const MIN_LABEL_SHARE = 0.07

export default function Donut({
  slices,
  size,
  thickness = 34,
  centreValue,
  centreLabel,
  onSelect
}: DonutProps) {
  const theme = useTheme()

  const total = slices.reduce((sum, slice) => sum + slice.value, 0)
  const radius = size / 2
  const ringRadius = radius - thickness / 2

  if (total <= 0) return null

  let cursor = -90

  return (
    <svg width={size} height={size} role="img" aria-label={`${centreLabel}: ${centreValue}`}>
      {slices.map((slice) => {
        const share = slice.value / total
        const sweep = share * 360
        const start = cursor
        const end = cursor + sweep
        cursor = end

        const gap = Math.min(GAP_DEGREES, sweep / 3)
        const arcStart = start + gap / 2
        const arcEnd = end - gap / 2

        const midAngle = (start + end) / 2
        const labelPoint = polar(radius, radius, ringRadius, midAngle)

        return (
          <Tooltip
            key={slice.key}
            title={
              <Box component="span" sx={{ display: 'block' }}>
                <Box component="span" sx={{ display: 'block', fontWeight: 600 }}>
                  {slice.label}
                </Box>
                {formatPercent(slice.value, total)}
                {slice.detail ? ` - ${slice.detail}` : ''}
              </Box>
            }
            followCursor
          >
            <g
              onClick={() => onSelect?.(slice)}
              style={{ cursor: onSelect ? 'pointer' : 'default' }}
            >
              <path
                d={arcPath(radius, radius, ringRadius, arcStart, arcEnd)}
                fill="none"
                stroke={slice.colour}
                strokeWidth={thickness}
                strokeLinecap="butt"
              />
              {share >= MIN_LABEL_SHARE && (
                <text
                  x={labelPoint.x}
                  y={labelPoint.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={11}
                  fontWeight={600}
                  fill={theme.palette.background.paper}
                  style={{ pointerEvents: 'none' }}
                >
                  {Math.round(share * 100)}%
                </text>
              )}
            </g>
          </Tooltip>
        )
      })}

      <text
        x={radius}
        y={radius - 8}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={22}
        fontWeight={600}
        fill={theme.palette.text.primary}
      >
        {centreValue}
      </text>
      <text
        x={radius}
        y={radius + 14}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={11.5}
        fill={theme.palette.text.secondary}
      >
        {centreLabel}
      </text>
    </svg>
  )
}

interface Point {
  x: number
  y: number
}

function polar(cx: number, cy: number, radius: number, degrees: number): Point {
  const radians = (degrees * Math.PI) / 180
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) }
}

function arcPath(cx: number, cy: number, radius: number, startDeg: number, endDeg: number): string {
  if (endDeg - startDeg >= 359.99) {
    const top = polar(cx, cy, radius, -90)
    const bottom = polar(cx, cy, radius, 90)
    return `M ${top.x} ${top.y} A ${radius} ${radius} 0 1 1 ${bottom.x} ${bottom.y} A ${radius} ${radius} 0 1 1 ${top.x} ${top.y}`
  }

  const start = polar(cx, cy, radius, startDeg)
  const end = polar(cx, cy, radius, endDeg)
  const largeArc = endDeg - startDeg > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`
}
