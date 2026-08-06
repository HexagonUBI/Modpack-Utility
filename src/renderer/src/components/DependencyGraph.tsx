import { useMemo } from 'react'
import { useTheme, type Theme } from '@mui/material/styles'
import { Box, Tooltip } from '@mui/material'
import type { ModDependency, ModFile } from '@shared/types'
import { isImplicitModId } from '@shared/modIds'
import { useT, type Messages } from '../i18n'

export type LinkState = 'satisfied' | 'missing' | 'disabled' | 'optional'

export const LINK_STATES: LinkState[] = ['satisfied', 'missing', 'disabled', 'optional']

export function linkStateLabel(state: LinkState, t: Messages): string {
  switch (state) {
    case 'satisfied':
      return t.dependencies.installed
    case 'missing':
      return t.dependencies.missing
    case 'disabled':
      return t.dependencies.installedButDisabled
    case 'optional':
      return t.dependencies.optional
  }
}

interface GraphNode {
  id: string
  label: string
  sublabel: string
  state: LinkState

  mod: ModFile | null
}

interface DependencyGraphProps {
  focus: ModFile
  mods: ModFile[]
  width: number

  includeAbsentOptional: boolean
  onSelect: (mod: ModFile) => void
}

const NODE_WIDTH = 210
const NODE_HEIGHT = 46
const ROW_GAP = 10
const COLUMN_GAP = 72
const PADDING_Y = 8
const CHAR_WIDTH = 6.3

export default function DependencyGraph({
  focus,
  mods,
  width,
  includeAbsentOptional,
  onSelect
}: DependencyGraphProps) {
  const t = useT()
  const theme = useTheme()

  const { requires, requiredBy } = useMemo(
    () => buildNeighbours(focus, mods, includeAbsentOptional, t),
    [focus, mods, includeAbsentOptional, t]
  )

  const rows = Math.max(requires.length, requiredBy.length, 1)
  const height = Math.max(rows * (NODE_HEIGHT + ROW_GAP) - ROW_GAP + PADDING_Y * 2, NODE_HEIGHT + PADDING_Y * 2)

  const hasLeft = requiredBy.length > 0
  const hasRight = requires.length > 0
  const columns = 1 + (hasLeft ? 1 : 0) + (hasRight ? 1 : 0)
  const contentWidth = columns * NODE_WIDTH + (columns - 1) * COLUMN_GAP
  const canvasWidth = Math.max(width, contentWidth)
  const offsetX = Math.max(0, (canvasWidth - contentWidth) / 2)

  const leftX = offsetX
  const centreX = hasLeft ? offsetX + NODE_WIDTH + COLUMN_GAP : offsetX
  const rightX = centreX + NODE_WIDTH + COLUMN_GAP
  const centreY = height / 2 - NODE_HEIGHT / 2

  const colours = {
    satisfied: theme.palette.text.secondary,
    missing: theme.palette.error.main,
    disabled: theme.palette.warning.main,
    optional: theme.palette.divider
  } as const

  const columnY = (index: number, count: number): number =>
    height / 2 - (count * (NODE_HEIGHT + ROW_GAP) - ROW_GAP) / 2 + index * (NODE_HEIGHT + ROW_GAP)

  return (
    <svg
      width={canvasWidth}
      height={height}
      role="img"
      aria-label={t.graph.dependenciesOf(focus.name ?? focus.fileName)}
    >
      {}
      {requiredBy.map((node, index) => (
        <Wire
          key={`in-${node.id}`}
          fromX={leftX + NODE_WIDTH}
          fromY={columnY(index, requiredBy.length) + NODE_HEIGHT / 2}
          toX={centreX}
          toY={centreY + NODE_HEIGHT / 2}
          state={node.state}
          colour={colours[node.state]}
        />
      ))}
      {requires.map((node, index) => (
        <Wire
          key={`out-${node.id}`}
          fromX={centreX + NODE_WIDTH}
          fromY={centreY + NODE_HEIGHT / 2}
          toX={rightX}
          toY={columnY(index, requires.length) + NODE_HEIGHT / 2}
          state={node.state}
          colour={colours[node.state]}
        />
      ))}

      {requiredBy.map((node, index) => (
        <Node
          key={node.id}
          node={node}
          x={leftX}
          y={columnY(index, requiredBy.length)}
          colour={colours[node.state]}
          theme={theme}
          t={t}
          onSelect={onSelect}
        />
      ))}

      <Node
        node={{
          id: focus.modId ?? focus.fileName,
          label: focus.name ?? focus.fileName,
          sublabel: focus.version ? `v${focus.version}` : (focus.modId ?? ''),
          state: focus.enabled ? 'satisfied' : 'disabled',
          mod: focus
        }}
        x={centreX}
        y={centreY}
        colour={theme.palette.primary.main}
        theme={theme}
        t={t}
        emphasis
        onSelect={onSelect}
      />

      {requires.map((node, index) => (
        <Node
          key={node.id}
          node={node}
          x={rightX}
          y={columnY(index, requires.length)}
          colour={colours[node.state]}
          theme={theme}
          t={t}
          onSelect={onSelect}
        />
      ))}

      {!hasLeft && (
        <text
          x={centreX + NODE_WIDTH / 2}
          y={centreY - 10}
          textAnchor="middle"
          fontSize={11.5}
          fill={theme.palette.text.secondary}
        >
          {t.dependencies.nothingRequiresThis}
        </text>
      )}
      {!hasRight && (
        <text
          x={centreX + NODE_WIDTH / 2}
          y={centreY + NODE_HEIGHT + 20}
          textAnchor="middle"
          fontSize={11.5}
          fill={theme.palette.text.secondary}
        >
          {t.dependencies.requiresNothing}
        </text>
      )}
    </svg>
  )
}

interface WireProps {
  fromX: number
  fromY: number
  toX: number
  toY: number
  state: LinkState
  colour: string
}

function Wire({ fromX, fromY, toX, toY, state, colour }: WireProps) {
  const midpoint = (fromX + toX) / 2
  const path = `M ${fromX} ${fromY} C ${midpoint} ${fromY}, ${midpoint} ${toY}, ${toX} ${toY}`

  return (
    <g>
      <path
        d={path}
        fill="none"
        stroke={colour}
        strokeWidth={state === 'missing' ? 2 : 1.5}
        strokeDasharray={state === 'optional' ? '4 4' : undefined}
        opacity={state === 'optional' ? 0.8 : 1}
      />
      <circle cx={toX} cy={toY} r={3} fill={colour} />
    </g>
  )
}

interface NodeProps {
  node: GraphNode
  x: number
  y: number
  colour: string
  theme: Theme
  t: Messages
  emphasis?: boolean
  onSelect: (mod: ModFile) => void
}

function Node({ node, x, y, colour, theme, t, emphasis, onSelect }: NodeProps) {
  const maxChars = Math.floor((NODE_WIDTH - 20) / CHAR_WIDTH)
  const clickable = node.mod !== null

  return (
    <Tooltip
      title={
        <Box component="span" sx={{ display: 'block' }}>
          <Box component="span" sx={{ display: 'block', fontWeight: 600 }}>
            {node.label}
          </Box>
          {linkStateLabel(node.state, t)}
          {node.mod ? '' : `. ${t.graph.notInModsFolder}`}
        </Box>
      }
      followCursor
    >
      <g
        onClick={() => node.mod && onSelect(node.mod)}
        style={{ cursor: clickable ? 'pointer' : 'default' }}
      >
        <rect
          x={x}
          y={y}
          width={NODE_WIDTH}
          height={NODE_HEIGHT}
          rx={6}
          fill={theme.palette.background.paper}
          stroke={colour}
          strokeWidth={emphasis ? 2 : 1}
          strokeDasharray={node.state === 'missing' ? '5 3' : undefined}
        />
        <text
          x={x + 10}
          y={y + 19}
          fontSize={12.5}
          fontWeight={emphasis ? 600 : 500}
          fill={theme.palette.text.primary}
        >
          {truncate(node.label, maxChars)}
        </text>
        <text x={x + 10} y={y + 35} fontSize={11} fill={theme.palette.text.secondary}>
          {truncate(node.sublabel, maxChars)}
        </text>
      </g>
    </Tooltip>
  )
}

interface Neighbours {
  requires: GraphNode[]
  requiredBy: GraphNode[]
}

function buildNeighbours(
  focus: ModFile,
  mods: ModFile[],
  includeAbsentOptional: boolean,
  t: Messages
): Neighbours {
  const byId = new Map<string, ModFile>()
  for (const mod of mods) {
    if (mod.modId) byId.set(mod.modId.toLowerCase(), mod)
    for (const provided of mod.provides) {
      if (!byId.has(provided.toLowerCase())) byId.set(provided.toLowerCase(), mod)
    }
  }

  const requires = focus.dependencies
    .filter((dependency) => !isImplicitModId(dependency.modId) && dependency.kind !== 'incompatible')
    .filter(
      (dependency) =>
        includeAbsentOptional ||
        dependency.kind !== 'optional' ||
        byId.has(dependency.modId.toLowerCase())
    )
    .map((dependency) => toNode(dependency, byId.get(dependency.modId.toLowerCase()) ?? null, t))

  const focusIds = new Set(
    [focus.modId, ...focus.provides].filter((id): id is string => Boolean(id)).map((id) => id.toLowerCase())
  )

  const requiredBy: GraphNode[] = []
  for (const mod of mods) {
    if (mod === focus) continue
    const link = mod.dependencies.find(
      (dependency) => focusIds.has(dependency.modId.toLowerCase()) && dependency.kind !== 'incompatible'
    )
    if (!link) continue

    requiredBy.push({
      id: mod.filePath,
      label: mod.name ?? mod.fileName,
      sublabel: link.kind === 'optional' ? t.graph.optionalDependency : t.graph.requiresThis,
      state: link.kind === 'optional' ? 'optional' : mod.enabled ? 'satisfied' : 'disabled',
      mod
    })
  }

  const byState = (a: GraphNode, b: GraphNode): number =>
    stateRank(a.state) - stateRank(b.state) || a.label.localeCompare(b.label)

  return { requires: requires.sort(byState), requiredBy: requiredBy.sort(byState) }
}

function toNode(dependency: ModDependency, provider: ModFile | null, t: Messages): GraphNode {
  const state: LinkState =
    dependency.kind === 'optional'
      ? 'optional'
      : provider === null
        ? 'missing'
        : provider.enabled
          ? 'satisfied'
          : 'disabled'

  return {
    id: dependency.modId,
    label: provider?.name ?? dependency.modId,
    sublabel: dependency.versionRange ?? linkStateLabel(state, t),
    state,
    mod: provider
  }
}

function stateRank(state: LinkState): number {
  switch (state) {
    case 'missing':
      return 0
    case 'disabled':
      return 1
    case 'satisfied':
      return 2
    case 'optional':
      return 3
  }
}

function truncate(value: string, maxChars: number): string {
  return value.length <= maxChars ? value : `${value.slice(0, Math.max(1, maxChars - 1))}...`
}
