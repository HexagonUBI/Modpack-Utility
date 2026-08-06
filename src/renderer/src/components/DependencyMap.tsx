import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import AddRounded from '@mui/icons-material/AddRounded'
import CenterFocusStrongRounded from '@mui/icons-material/CenterFocusStrongRounded'
import RemoveRounded from '@mui/icons-material/RemoveRounded'
import { hasProblems, type ModFile } from '@shared/types'
import { isImplicitModId } from '@shared/modIds'
import { useT, type Messages } from '../i18n'

const NODE_WIDTH = 156
const NODE_HEIGHT = 30
const COLUMN_GAP = 14
const LAYER_GAP = 46
const CLUSTER_GAP = 52

const SINGLETON_GAP_X = 10
const SINGLETON_GAP_Y = 8

const MAX_NODES_PER_ROW = 8
const SUB_ROW_GAP = 8
const CHAR_WIDTH = 6.1

const DRAG_THRESHOLD = 4
const MIN_ZOOM = 0.25
const MAX_ZOOM = 2.5

const MIN_AUTO_FIT_ZOOM = 0.38
const MAX_AUTO_FIT_ZOOM = 1.2

interface MapNode {
  id: string
  mod: ModFile
  layer: number
  x: number
  y: number
}

interface MapEdge {
  from: string
  to: string
  optional: boolean

  inactive: boolean

  conflict?: boolean

  missing?: boolean
}

interface DependencyMapProps {
  mods: ModFile[]
  includeOptional: boolean
  width: number
  height: number
  selectedPath: string | null
  onSelect: (mod: ModFile) => void
  onClearSelection: () => void
}

export default function DependencyMap({
  mods,
  includeOptional,
  width,
  height,
  selectedPath,
  onSelect,
  onClearSelection
}: DependencyMapProps) {
  const t = useT()
  const theme = useTheme()
  const { nodes, edges, extent } = useMemo(

    () => buildLayout(mods, includeOptional, width / Math.max(height, 1)),
    [mods, includeOptional, width, height]
  )

  const [transform, setTransform] = useState({ x: 0, y: 0, k: 0.75 })
  const [hovered, setHovered] = useState<string | null>(null)
  const dragState = useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
    moved: boolean
    captured: boolean
  } | null>(null)

  const fitToBox = useCallback(
    (left: number, top: number, boxWidth: number, boxHeight: number) => {
      if (boxWidth <= 0 || boxHeight <= 0) return

      const scale = Math.min(width / (boxWidth + 80), height / (boxHeight + 80))
      const k = clamp(scale, MIN_AUTO_FIT_ZOOM, MAX_AUTO_FIT_ZOOM)

      setTransform({
        x: width / 2 - (left + boxWidth / 2) * k,
        y: height / 2 - (top + boxHeight / 2) * k,
        k
      })
    },
    [width, height]
  )

  const fit = useCallback(() => {
    fitToBox(0, 0, extent.width, extent.height)
  }, [fitToBox, extent])

  const zoomBy = useCallback(
    (factor: number) => {
      setTransform((current) => {
        const k = clamp(current.k * factor, MIN_ZOOM, MAX_ZOOM)

        const cx = width / 2
        const cy = height / 2
        return {
          k,
          x: cx - ((cx - current.x) / current.k) * k,
          y: cy - ((cy - current.y) / current.k) * k
        }
      })
    },
    [width, height]
  )

  const onWheel = useCallback((event: React.WheelEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const pointerX = event.clientX - rect.left
    const pointerY = event.clientY - rect.top

    setTransform((current) => {
      const k = clamp(current.k * (event.deltaY < 0 ? 1.12 : 1 / 1.12), MIN_ZOOM, MAX_ZOOM)

      return {
        k,
        x: pointerX - ((pointerX - current.x) / current.k) * k,
        y: pointerY - ((pointerY - current.y) / current.k) * k
      }
    })
  }, [])

  const fittedFor = useRef('')
  useEffect(() => {
    const key = `${extent.width}x${extent.height}@${width}x${height}`
    if (fittedFor.current === key) return
    fittedFor.current = key
    fit()
  }, [extent, width, height, fit])

  const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes])
  const active = hovered ?? selectedPath

  const relatedTo = useCallback(
    (id: string): Set<string> => {
      const downstream = new Map<string, string[]>()
      const upstream = new Map<string, string[]>()
      for (const edge of edges) {
        if (!downstream.has(edge.from)) downstream.set(edge.from, [])
        if (!upstream.has(edge.to)) upstream.set(edge.to, [])
        downstream.get(edge.from)!.push(edge.to)
        upstream.get(edge.to)!.push(edge.from)
      }

      const related = new Set<string>([id])
      for (const direction of [downstream, upstream]) {
        const queue = [id]
        while (queue.length > 0) {
          const current = queue.pop()!
          for (const next of direction.get(current) ?? []) {
            if (related.has(next)) continue
            related.add(next)
            queue.push(next)
          }
        }
      }
      return related
    },
    [edges]
  )

  const highlighted = useMemo(() => (active ? relatedTo(active) : null), [active, relatedTo])

  const framedFor = useRef<string | null>(null)
  useEffect(() => {
    if (framedFor.current === selectedPath) return
    framedFor.current = selectedPath

    if (selectedPath === null) {
      fit()
      return
    }

    const group = relatedTo(selectedPath)
    const members = nodes.filter((node) => group.has(node.id))
    if (members.length === 0) return

    const left = Math.min(...members.map((node) => node.x))
    const top = Math.min(...members.map((node) => node.y))
    const right = Math.max(...members.map((node) => node.x + NODE_WIDTH))
    const bottom = Math.max(...members.map((node) => node.y + NODE_HEIGHT))

    fitToBox(left, top, right - left, bottom - top)
  }, [selectedPath, nodes, relatedTo, fit, fitToBox])

  if (nodes.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary', p: 2 }}>
        {t.graph.nothingToDraw}
      </Typography>
    )
  }

  return (
    <Box sx={{ position: 'relative' }}>
      <svg
        width={width}
        height={height}
        onWheel={onWheel}
        onPointerDown={(event) => {
          dragState.current = {
            pointerId: event.pointerId,
            startX: event.clientX - transform.x,
            startY: event.clientY - transform.y,
            originX: event.clientX,
            originY: event.clientY,
            moved: false,
            captured: false
          }
        }}
        onPointerMove={(event) => {
          const drag = dragState.current
          if (!drag || drag.pointerId !== event.pointerId) return

          if (!drag.moved) {
            const distance = Math.hypot(event.clientX - drag.originX, event.clientY - drag.originY)
            if (distance < DRAG_THRESHOLD) return
            drag.moved = true
            drag.captured = true
            event.currentTarget.setPointerCapture(event.pointerId)
          }

          setTransform((current) => ({
            ...current,
            x: event.clientX - drag.startX,
            y: event.clientY - drag.startY
          }))
        }}
        onPointerUp={(event) => {
          const drag = dragState.current
          dragState.current = null
          if (drag?.captured) event.currentTarget.releasePointerCapture(event.pointerId)

          if (drag && !drag.moved && event.target === event.currentTarget) onClearSelection()
        }}
        style={{ cursor: 'grab', touchAction: 'none', display: 'block' }}
        role="img"
        aria-label={t.graph.dependencyMapOf(mods.length)}
      >
        <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
          {edges.map((edge) => {
            const from = byId.get(edge.from)
            const to = byId.get(edge.to)
            if (!from || !to) return null

            const dimmed = highlighted !== null && !(highlighted.has(edge.from) && highlighted.has(edge.to))
            const colour = edge.conflict
              ? theme.palette.error.main
              : edge.inactive
                ? theme.palette.warning.main
                : edge.optional
                  ? theme.palette.divider
                  : theme.palette.text.secondary

            return (
              <path
                key={`${edge.from}->${edge.to}${edge.conflict ? ':x' : ''}`}
                d={link(from, to)}
                fill="none"
                stroke={colour}
                strokeWidth={dimmed ? 1 : edge.conflict ? 2 : 1.6}
                strokeDasharray={edge.conflict ? '2 3' : edge.optional ? '4 4' : undefined}
                opacity={dimmed ? 0.12 : 0.75}
              />
            )
          })}

          {nodes.map((node) => {
            const dimmed = highlighted !== null && !highlighted.has(node.id)
            const isSelected = node.id === selectedPath
            const broken = hasProblems(node.mod.problems)
            const stroke = broken
              ? theme.palette.error.main
              : !node.mod.enabled
                ? theme.palette.warning.main
                : isSelected
                  ? theme.palette.primary.main
                  : theme.palette.divider

            return (
              <g
                key={node.id}
                opacity={dimmed ? 0.2 : 1}
                onPointerEnter={() => setHovered(node.id)}
                onPointerLeave={() => setHovered(null)}
                onClick={() => onSelect(node.mod)}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  x={node.x}
                  y={node.y}
                  width={NODE_WIDTH}
                  height={NODE_HEIGHT}
                  rx={5}
                  fill={theme.palette.background.paper}
                  stroke={stroke}
                  strokeWidth={isSelected || broken ? 2 : 1}
                />
                <title>{describeNode(node.mod, t)}</title>
                <text
                  x={node.x + 9}
                  y={node.y + NODE_HEIGHT / 2}
                  dominantBaseline="central"
                  fontSize={11.5}
                  fontWeight={isSelected ? 600 : 500}
                  fill={broken ? theme.palette.error.main : theme.palette.text.primary}
                  style={{ pointerEvents: 'none' }}
                >
                  {truncate(node.mod.name ?? node.mod.fileName, Math.floor((NODE_WIDTH - 18) / CHAR_WIDTH))}
                </text>
              </g>
            )
          })}
        </g>
      </svg>

      <Stack
        direction="row"
        spacing={0.5}
        sx={{
          position: 'absolute',
          right: 8,
          bottom: 8,
          backgroundColor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          p: 0.25
        }}
      >
        <Tooltip title={t.graph.zoomOut}>
          <IconButton size="small" aria-label={t.graph.zoomOut} onClick={() => zoomBy(1 / 1.25)}>
            <RemoveRounded fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t.graph.fitToView}>
          <IconButton size="small" aria-label={t.graph.fitToView} onClick={fit}>
            <CenterFocusStrongRounded fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t.graph.zoomIn}>
          <IconButton size="small" aria-label={t.graph.zoomIn} onClick={() => zoomBy(1.25)}>
            <AddRounded fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      <Typography
        variant="caption"
        sx={{ position: 'absolute', left: 10, bottom: 10, color: 'text.secondary' }}
      >
        {t.dependencies.hoverHint}
      </Typography>
    </Box>
  )
}

interface Layout {
  nodes: MapNode[]
  edges: MapEdge[]
  extent: { width: number; height: number }
}

function buildLayout(mods: ModFile[], includeOptional: boolean, aspect: number): Layout {
  const providers = new Map<string, ModFile>()
  for (const mod of mods) {
    for (const id of [mod.modId, ...mod.provides]) {
      if (id && !providers.has(id.toLowerCase())) providers.set(id.toLowerCase(), mod)
    }
  }

  const edges: MapEdge[] = []
  const adjacency = new Map<string, Set<string>>()
  const dependencies = new Map<string, string[]>()

  const link = (from: string, to: string): void => {
    if (!adjacency.has(from)) adjacency.set(from, new Set())
    if (!adjacency.has(to)) adjacency.set(to, new Set())
    adjacency.get(from)!.add(to)
    adjacency.get(to)!.add(from)
  }

  for (const mod of mods) {
    const outgoing: string[] = []

    for (const conflictId of mod.problems.conflictsWith) {
      const other = providers.get(conflictId.toLowerCase())
      if (!other || other === mod) continue
      edges.push({ from: mod.filePath, to: other.filePath, optional: false, inactive: false, conflict: true })
      link(mod.filePath, other.filePath)
    }

    for (const dependency of mod.dependencies) {
      if (isImplicitModId(dependency.modId)) continue
      if (dependency.kind === 'incompatible') continue
      if (dependency.kind === 'optional' && !includeOptional) continue

      const provider = providers.get(dependency.modId.toLowerCase())
      if (!provider || provider === mod) continue

      edges.push({
        from: mod.filePath,
        to: provider.filePath,
        optional: dependency.kind === 'optional',
        inactive: !provider.enabled
      })
      outgoing.push(provider.filePath)
      link(mod.filePath, provider.filePath)
    }

    dependencies.set(mod.filePath, outgoing)
  }

  const byPath = new Map(mods.map((mod) => [mod.filePath, mod]))
  const layers = assignLayers(mods, dependencies)
  const components = findComponents(mods, adjacency)

  const connected = components.filter((component) => component.length > 1)
  const isolated = components.filter((component) => component.length === 1).map((group) => group[0]!)

  const placedClusters = connected.map((component) => layoutComponent(component, layers, byPath, edges))

  const clusterArea = placedClusters.reduce(
    (sum, cluster) => sum + (cluster.width + CLUSTER_GAP) * (cluster.height + CLUSTER_GAP),
    0
  )
  const isolatedArea = isolated.length * (NODE_WIDTH + SINGLETON_GAP_X) * (NODE_HEIGHT + SINGLETON_GAP_Y)
  const widestCluster = Math.max(NODE_WIDTH, ...placedClusters.map((cluster) => cluster.width))
  const targetWidth = Math.max(widestCluster, Math.sqrt(Math.max(clusterArea + isolatedArea, 1) * aspect))

  const nodes: MapNode[] = []
  let rowX = 0
  let rowY = 0
  let rowHeight = 0
  let maxWidth = 0

  for (const cluster of placedClusters) {
    if (rowX > 0 && rowX + cluster.width > targetWidth) {
      rowY += rowHeight + CLUSTER_GAP
      rowX = 0
      rowHeight = 0
    }

    for (const node of cluster.nodes) {
      nodes.push({ ...node, x: node.x + rowX, y: node.y + rowY })
    }

    rowX += cluster.width + CLUSTER_GAP
    rowHeight = Math.max(rowHeight, cluster.height)
    maxWidth = Math.max(maxWidth, rowX - CLUSTER_GAP)
  }

  if (isolated.length > 0) {
    const startY = nodes.length > 0 ? rowY + rowHeight + CLUSTER_GAP : 0
    const perRow = Math.max(1, Math.floor((targetWidth + SINGLETON_GAP_X) / (NODE_WIDTH + SINGLETON_GAP_X)))

    isolated.forEach((mod, index) => {
      const column = index % perRow
      const row = Math.floor(index / perRow)
      nodes.push({
        id: mod.filePath,
        mod,
        layer: 0,
        x: column * (NODE_WIDTH + SINGLETON_GAP_X),
        y: startY + row * (NODE_HEIGHT + SINGLETON_GAP_Y)
      })
    })

    const rows = Math.ceil(isolated.length / perRow)
    const usedColumns = Math.min(perRow, isolated.length)
    maxWidth = Math.max(maxWidth, usedColumns * (NODE_WIDTH + SINGLETON_GAP_X) - SINGLETON_GAP_X)
    rowY = startY
    rowHeight = rows * (NODE_HEIGHT + SINGLETON_GAP_Y) - SINGLETON_GAP_Y
  }

  return { nodes, edges, extent: { width: maxWidth, height: rowY + rowHeight } }
}

function assignLayers(mods: ModFile[], dependencies: Map<string, string[]>): Map<string, number> {
  const layers = new Map<string, number>()
  const visiting = new Set<string>()

  const resolve = (path: string): number => {
    const cached = layers.get(path)
    if (cached !== undefined) return cached

    if (visiting.has(path)) return 0

    visiting.add(path)
    let depth = 0
    for (const target of dependencies.get(path) ?? []) {
      depth = Math.max(depth, resolve(target) + 1)
    }
    visiting.delete(path)

    layers.set(path, depth)
    return depth
  }

  for (const mod of mods) resolve(mod.filePath)
  return layers
}

function findComponents(mods: ModFile[], adjacency: Map<string, Set<string>>): ModFile[][] {
  const byPath = new Map(mods.map((mod) => [mod.filePath, mod]))
  const seen = new Set<string>()
  const components: ModFile[][] = []

  for (const mod of mods) {
    if (seen.has(mod.filePath)) continue

    const stack = [mod.filePath]
    const group: ModFile[] = []
    seen.add(mod.filePath)

    while (stack.length > 0) {
      const path = stack.pop()!
      const current = byPath.get(path)
      if (current) group.push(current)

      for (const neighbour of adjacency.get(path) ?? []) {
        if (seen.has(neighbour)) continue
        seen.add(neighbour)
        stack.push(neighbour)
      }
    }

    components.push(group)
  }

  return components.sort((a, b) => b.length - a.length)
}

interface PlacedComponent {
  nodes: MapNode[]
  width: number
  height: number
}

function layoutComponent(
  component: ModFile[],
  layers: Map<string, number>,
  byPath: Map<string, ModFile>,
  edges: MapEdge[]
): PlacedComponent {
  if (component.length === 1) {
    const mod = component[0]!
    return {
      nodes: [{ id: mod.filePath, mod, layer: 0, x: 0, y: 0 }],
      width: NODE_WIDTH,
      height: NODE_HEIGHT
    }
  }

  const paths = new Set(component.map((mod) => mod.filePath))
  const byLayer = new Map<number, string[]>()

  for (const mod of component) {
    const layer = layers.get(mod.filePath) ?? 0
    if (!byLayer.has(layer)) byLayer.set(layer, [])
    byLayer.get(layer)!.push(mod.filePath)
  }

  const localEdges = edges.filter((edge) => paths.has(edge.from) && paths.has(edge.to))
  const order = new Map<string, number>()
  const sortedLayers = [...byLayer.keys()].sort((a, b) => a - b)

  for (const layer of sortedLayers) {
    byLayer.get(layer)!.forEach((path, index) => order.set(path, index))
  }

  for (let pass = 0; pass < 2; pass++) {
    for (const layer of sortedLayers) {
      const row = byLayer.get(layer)!
      const scores = new Map<string, number>()

      for (const path of row) {
        const neighbours = localEdges
          .filter((edge) => edge.from === path || edge.to === path)
          .map((edge) => (edge.from === path ? edge.to : edge.from))
          .filter((other) => (layers.get(other) ?? 0) !== layer)

        const positions = neighbours.map((other) => order.get(other) ?? 0)
        scores.set(
          path,
          positions.length === 0
            ? (order.get(path) ?? 0)
            : positions.reduce((sum, value) => sum + value, 0) / positions.length
        )
      }

      row.sort((a, b) => (scores.get(a) ?? 0) - (scores.get(b) ?? 0))
      row.forEach((path, index) => order.set(path, index))
    }
  }

  const widest = Math.min(
    MAX_NODES_PER_ROW,
    Math.max(...sortedLayers.map((layer) => byLayer.get(layer)!.length))
  )
  const componentWidth = widest * NODE_WIDTH + (widest - 1) * COLUMN_GAP

  const topDown = [...sortedLayers].sort((a, b) => b - a)
  const layerTop = new Map<number, number>()
  let cursorY = 0

  for (const layer of topDown) {
    layerTop.set(layer, cursorY)
    const subRows = Math.ceil(byLayer.get(layer)!.length / MAX_NODES_PER_ROW)
    cursorY += subRows * NODE_HEIGHT + (subRows - 1) * SUB_ROW_GAP + LAYER_GAP
  }

  const nodes: MapNode[] = []
  for (const layer of sortedLayers) {
    const row = byLayer.get(layer)!

    row.forEach((path, index) => {
      const mod = byPath.get(path)
      if (!mod) return

      const subRow = Math.floor(index / MAX_NODES_PER_ROW)
      const column = index % MAX_NODES_PER_ROW
      const inThisSubRow = Math.min(MAX_NODES_PER_ROW, row.length - subRow * MAX_NODES_PER_ROW)
      const subRowWidth = inThisSubRow * NODE_WIDTH + (inThisSubRow - 1) * COLUMN_GAP

      nodes.push({
        id: path,
        mod,
        layer,
        x: (componentWidth - subRowWidth) / 2 + column * (NODE_WIDTH + COLUMN_GAP),
        y: (layerTop.get(layer) ?? 0) + subRow * (NODE_HEIGHT + SUB_ROW_GAP)
      })
    })
  }

  return { nodes, width: componentWidth, height: Math.max(cursorY - LAYER_GAP, NODE_HEIGHT) }
}

function link(from: MapNode, to: MapNode): string {
  const startX = from.x + NODE_WIDTH / 2
  const startY = from.y + NODE_HEIGHT
  const endX = to.x + NODE_WIDTH / 2
  const endY = to.y
  const midY = (startY + endY) / 2

  return `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`
}

function describeNode(mod: ModFile, t: Messages): string {
  const name = mod.name ?? mod.fileName
  const parts: string[] = [name]

  if (mod.problems.missing.length > 0) {
    parts.push(t.graph.missingList(mod.problems.missing.join(', ')))
  }
  if (mod.problems.disabledDependencies.length > 0) {
    parts.push(t.graph.disabledDependencyList(mod.problems.disabledDependencies.join(', ')))
  }
  if (mod.problems.conflictsWith.length > 0) {
    parts.push(t.graph.incompatibleList(mod.problems.conflictsWith.join(', ')))
  }
  if (!mod.enabled) parts.push(t.graph.modIsDisabled)

  return parts.join('\n')
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function truncate(value: string, maxChars: number): string {
  return value.length <= maxChars ? value : `${value.slice(0, Math.max(1, maxChars - 1))}...`
}
