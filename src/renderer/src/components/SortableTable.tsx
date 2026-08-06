import { useState } from 'react'
import { TableCell, TableSortLabel, type TableCellProps } from '@mui/material'

export type SortDirection = 'asc' | 'desc'

export interface SortState<K extends string> {
  key: K
  direction: SortDirection
}

export interface Sorter<K extends string> {
  sort: SortState<K>
  toggle: (key: K) => void
}

export function useSort<K extends string>(initialKey: K, initialDirection: SortDirection = 'asc'): Sorter<K> {
  const [sort, setSort] = useState<SortState<K>>({ key: initialKey, direction: initialDirection })

  return {
    sort,
    toggle: (key) =>
      setSort((current) =>
        current.key === key
          ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
          : { key, direction: initialDirectionFor(key, initialKey, initialDirection) }
      )
  }
}

function initialDirectionFor<K extends string>(key: K, initialKey: K, fallback: SortDirection): SortDirection {
  return key === initialKey ? fallback : 'asc'
}

interface SortHeaderCellProps<K extends string> extends Omit<TableCellProps, 'onClick'> {
  columnKey: K
  sorter: Sorter<K>

  numeric?: boolean
  children: React.ReactNode
}

export function SortHeaderCell<K extends string>({
  columnKey,
  sorter,
  numeric,
  children,
  ...cellProps
}: SortHeaderCellProps<K>) {
  const active = sorter.sort.key === columnKey

  return (
    <TableCell {...cellProps} sortDirection={active ? sorter.sort.direction : false}>
      <TableSortLabel
        active={active}
        direction={active ? sorter.sort.direction : numeric ? 'desc' : 'asc'}
        onClick={() => sorter.toggle(columnKey)}
      >
        {children}
      </TableSortLabel>
    </TableCell>
  )
}

export function compareFoldersFirst(
  a: { isDirectory: boolean; name: string },
  b: { isDirectory: boolean; name: string }
): number {
  if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
  return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
}

export function applyDirection(comparison: number, direction: SortDirection): number {
  return direction === 'asc' ? comparison : -comparison
}
