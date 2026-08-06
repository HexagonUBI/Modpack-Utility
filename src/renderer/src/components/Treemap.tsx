import { useMemo } from 'react'
import { hierarchy, treemap, treemapSquarify } from 'd3-hierarchy'
import { Box, Tooltip } from '@mui/material'
import type { SizeNode } from '@shared/types'
import { formatBytes, formatCount, formatPercent } from '../format'
import { colourForCategory, inkOnFill } from '../viz'
import { SURFACE, type ThemeMode } from '../theme'

interface TreemapProps {
  node: SizeNode
  width: number
  height: number
  mode: ThemeMode
  onOpen: (node: SizeNode) => void
}

interface Tile {
  ref?: SizeNode
  value?: number
  children?: Tile[]
}

const GAP = 2
const CORNER = 4
const LABEL_MIN_WIDTH = 54
const LABEL_MIN_HEIGHT = 28
const SIZE_LINE_MIN_HEIGHT = 44
const CHAR_WIDTH = 6.4

export default function Treemap({ node, width, height, mode, onOpen }: TreemapProps) {
  const tiles = useMemo(() => {
    if (width < 40 || height < 40) return []

    const children = (node.children ?? []).filter((child) => child.sizeBytes > 0)
    if (children.length === 0) return []

    const root = hierarchy<Tile>({ children: children.map((ref) => ({ ref, value: ref.sizeBytes })) })
      .sum((datum) => datum.value ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))

    const layout = treemap<Tile>()
      .tile(treemapSquarify)
      .size([width, height])
      .paddingInner(GAP)
      .round(true)

    return layout(root).leaves()
  }, [node, width, height])

  const total = node.sizeBytes

  return (
    <svg width={width} height={height} role="img" aria-label={`Size breakdown of ${node.name}`}>
      {tiles.map((tile) => {
        const ref = tile.data.ref
        if (!ref) return null

        const x = tile.x0
        const y = tile.y0
        const w = Math.max(0, tile.x1 - tile.x0)
        const h = Math.max(0, tile.y1 - tile.y0)
        if (w < 1 || h < 1) return null

        const fill = colourForCategory(ref.category, mode)
        const ink = inkOnFill(fill)
        const showLabel = w >= LABEL_MIN_WIDTH && h >= LABEL_MIN_HEIGHT
        const showSize = showLabel && h >= SIZE_LINE_MIN_HEIGHT
        const maxChars = Math.max(3, Math.floor((w - 12) / CHAR_WIDTH))
        const canOpen = ref.path !== ''

        return (
          <Tooltip
            key={`${ref.path}:${x}:${y}`}
            title={
              <Box component="span" sx={{ display: 'block' }}>
                <Box component="span" sx={{ display: 'block', fontWeight: 700 }}>
                  {ref.name}
                </Box>
                {formatBytes(ref.sizeBytes)} - {formatPercent(ref.sizeBytes, total)} of this folder
                <Box component="span" sx={{ display: 'block', opacity: 0.8 }}>
                  {formatCount(ref.fileCount)} {ref.fileCount === 1 ? 'file' : 'files'}
                  {ref.isDirectory && ref.children ? ' - click to open' : ''}
                </Box>
              </Box>
            }
            followCursor
          >
            <g
              onClick={() => canOpen && onOpen(ref)}
              style={{ cursor: canOpen ? 'pointer' : 'default' }}
            >
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx={CORNER}
                fill={fill}
                stroke={SURFACE[mode]}
                strokeWidth={1}
              />
              {showLabel && (
                <text
                  x={x + 6}
                  y={y + 16}
                  fill={ink}
                  fontSize={11.5}
                  fontWeight={600}
                  style={{ pointerEvents: 'none' }}
                >
                  {truncate(ref.name, maxChars)}
                </text>
              )}
              {showSize && (
                <text
                  x={x + 6}
                  y={y + 31}
                  fill={ink}
                  fontSize={11}
                  opacity={0.85}
                  style={{ pointerEvents: 'none' }}
                >
                  {formatBytes(ref.sizeBytes)}
                </text>
              )}
            </g>
          </Tooltip>
        )
      })}
    </svg>
  )
}

function truncate(value: string, maxChars: number): string {
  return value.length <= maxChars ? value : `${value.slice(0, Math.max(1, maxChars - 1))}...`
}
