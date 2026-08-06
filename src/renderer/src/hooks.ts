import { useCallback, useEffect, useRef, useState } from 'react'
import type { SizeNode } from '@shared/types'

export interface Size {
  width: number
  height: number
}

export function useElementSize<T extends HTMLElement>(): [(node: T | null) => void, Size] {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 })
  const observerRef = useRef<ResizeObserver | null>(null)

  const ref = useCallback((node: T | null) => {
    observerRef.current?.disconnect()
    if (!node) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      setSize({ width: Math.round(width), height: Math.round(height) })
    })

    observer.observe(node)
    observerRef.current = observer
    setSize({ width: node.clientWidth, height: node.clientHeight })
  }, [])

  useEffect(() => () => observerRef.current?.disconnect(), [])

  return [ref, size]
}

export interface DirectoryExpansion {
  isExpanded(path: string): boolean
  isLoading(path: string): boolean

  childrenOf(path: string, preloaded: SizeNode[] | null): SizeNode[] | null
  toggle(path: string, preloaded: SizeNode[] | null): void
  collapseAll(): void
}

export function useDirectoryExpansion(): DirectoryExpansion {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState<Set<string>>(new Set())
  const [cache, setCache] = useState<Record<string, SizeNode[]>>({})

  const toggle = useCallback(
    (path: string, preloaded: SizeNode[] | null) => {
      if (path === '') return

      setExpanded((current) => {
        const next = new Set(current)
        if (next.has(path)) next.delete(path)
        else next.add(path)
        return next
      })

      if (preloaded !== null || cache[path]) return

      setLoading((current) => new Set(current).add(path))
      void window.api
        .listDirectory(path)
        .then((children) => setCache((current) => ({ ...current, [path]: children })))
        .catch(() => setCache((current) => ({ ...current, [path]: [] })))
        .finally(() =>
          setLoading((current) => {
            const next = new Set(current)
            next.delete(path)
            return next
          })
        )
    },
    [cache]
  )

  return {
    isExpanded: (path) => expanded.has(path),
    isLoading: (path) => loading.has(path),
    childrenOf: (path, preloaded) => preloaded ?? cache[path] ?? null,
    toggle,
    collapseAll: () => setExpanded(new Set())
  }
}

type AsyncState<T> =
  | { status: 'idle'; data: null; error: null }
  | { status: 'loading'; data: T | null; error: null }
  | { status: 'ready'; data: T; error: null }
  | { status: 'error'; data: null; error: string }

export function useAsyncData<T>(key: string | null, loader: (key: string) => Promise<T>): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'idle', data: null, error: null })
  const activeKey = useRef<string | null>(null)

  useEffect(() => {
    activeKey.current = key
    if (key === null) {
      setState({ status: 'idle', data: null, error: null })
      return
    }

    setState((previous) => ({ status: 'loading', data: previous.data, error: null }))

    loader(key)
      .then((data) => {
        if (activeKey.current !== key) return
        setState({ status: 'ready', data, error: null })
      })
      .catch((error: unknown) => {
        if (activeKey.current !== key) return
        setState({
          status: 'error',
          data: null,
          error: error instanceof Error ? error.message : String(error)
        })
      })
  }, [key, loader])

  return state
}
