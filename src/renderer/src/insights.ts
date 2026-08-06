import type { Instance, InstanceAnalysis, StorageReport } from '@shared/types'
import { formatBytes, formatMemory } from './format'
import type { Messages } from './i18n'

export type InsightSeverity = 'critical' | 'serious' | 'warning' | 'good' | 'info'

export interface Insight {
  id: string
  severity: InsightSeverity
  title: string
  detail: string

  focusModPath?: string
}

const PERFORMANCE_MOD_IDS = new Set([
  'sodium',
  'embeddium',
  'rubidium',
  'lithium',
  'radium',
  'canary',
  'ferritecore',
  'modernfix',
  'entityculling',
  'immediatelyfast',
  'moreculling',
  'badoptimizations',
  'saturn',
  'alternate_current',
  'noisium',
  'scalablelux',
  'c2me',
  'krypton',
  'memoryleakfix',
  'clumps',
  'fastload'
])

const OBSOLETE_GC_FLAGS = ['-XX:+UseConcMarkSweepGC', '-XX:+UseParNewGC', '-XX:+CMSIncrementalMode']

export function buildInsights(
  instance: Instance,
  analysis: InstanceAnalysis | null,
  storage: StorageReport | null,
  t: Messages
): Insight[] {
  const insights: Insight[] = []
  if (!analysis) return insights

  const enabledMods = analysis.mods.mods.filter((mod) => mod.enabled)
  const modCount = enabledMods.length

  addConflictInsight(insights, analysis, t)
  addDependencyInsights(insights, analysis, t)
  addMemoryInsights(insights, instance, modCount, t)
  addPerformanceModInsight(insights, enabledMods.map((mod) => mod.modId?.toLowerCase() ?? ''), t)
  addJavaArgInsights(insights, instance, t)
  addConfigInsights(insights, analysis, t)
  addDisabledModInsight(insights, analysis, t)
  addUnidentifiedInsight(insights, analysis, t)
  addStorageInsights(insights, storage, t)

  return insights.sort((a, b) => severityRank(a.severity) - severityRank(b.severity))
}

function addConflictInsight(insights: Insight[], analysis: InstanceAnalysis, t: Messages): void {
  const conflicts = analysis.mods.conflicts
  if (conflicts.length === 0) return

  insights.push({
    id: 'conflicts',
    severity: 'critical',
    title: t.insights.conflictsTitle(conflicts.length),
    detail: conflicts
      .map((conflict) => t.dependencies.conflictSummary(conflict.declaredBy, conflict.modId))
      .join('. '),
    focusModPath: analysis.mods.mods.find((mod) => mod.problems.conflictsWith.length > 0)?.filePath
  })
}

function addDependencyInsights(insights: Insight[], analysis: InstanceAnalysis, t: Messages): void {
  const missing = analysis.mods.missingDependencies
  if (missing.length === 0) return

  const disabled = missing.filter((entry) => entry.presentButDisabled)
  const absent = missing.filter((entry) => !entry.presentButDisabled)

  if (absent.length > 0) {
    insights.push({
      id: 'missing-dependencies',
      severity: 'critical',
      title: t.insights.missingDependenciesTitle(absent.length),
      detail: t.insights.missingDependenciesDetail(
        absent
          .slice(0, 5)
          .map((entry) => entry.modId)
          .join(', '),
        Math.max(0, absent.length - 5)
      ),
      focusModPath: analysis.mods.mods.find((mod) => mod.problems.missing.length > 0)?.filePath
    })
  }

  if (disabled.length > 0) {
    insights.push({
      id: 'disabled-dependencies',
      severity: 'serious',
      title: t.insights.disabledDependenciesTitle(disabled.length),
      detail: t.insights.disabledDependenciesDetail(disabled.map((entry) => entry.modId).join(', ')),
      focusModPath: analysis.mods.mods.find((mod) => mod.problems.disabledDependencies.length > 0)
        ?.filePath
    })
  }
}

function addMemoryInsights(
  insights: Insight[],
  instance: Instance,
  modCount: number,
  t: Messages
): void {
  const maxMb = instance.memory?.maxMb ?? null

  if (maxMb === null) {
    insights.push({
      id: 'memory-default',
      severity: 'info',
      title: t.insights.memoryDefaultTitle,
      detail:
        modCount > 100
          ? t.insights.memoryDefaultManyMods(modCount)
          : t.insights.memoryDefaultDetail
    })
    return
  }

  if (modCount > 150 && maxMb < 4096) {
    insights.push({
      id: 'memory-low',
      severity: 'serious',
      title: t.insights.memoryLowTitle(formatMemory(maxMb, t), modCount),
      detail: t.insights.memoryLowDetail
    })
    return
  }

  if (maxMb > 12288 || (maxMb > 8192 && modCount < 250)) {
    insights.push({
      id: 'memory-high',
      severity: 'warning',
      title: t.insights.memoryHighTitle(formatMemory(maxMb, t)),
      detail: t.insights.memoryHighDetail
    })
  }
}

function addPerformanceModInsight(insights: Insight[], enabledIds: string[], t: Messages): void {
  const installed = enabledIds.filter((id) => PERFORMANCE_MOD_IDS.has(id))

  if (installed.length === 0) {
    insights.push({
      id: 'no-performance-mods',
      severity: 'warning',
      title: t.insights.noPerformanceModsTitle,
      detail: t.insights.noPerformanceModsDetail
    })
    return
  }

  insights.push({
    id: 'performance-mods',
    severity: 'good',
    title: t.insights.performanceModsTitle(installed.length),
    detail: installed.join(', ')
  })
}

function addJavaArgInsights(insights: Insight[], instance: Instance, t: Messages): void {
  const args = instance.javaArgs
  if (!args) return

  const obsolete = OBSOLETE_GC_FLAGS.filter((flag) => args.includes(flag))
  if (obsolete.length > 0) {
    insights.push({
      id: 'obsolete-gc',
      severity: 'serious',
      title: t.insights.obsoleteGcTitle,
      detail: t.insights.obsoleteGcDetail(obsolete.join(', '))
    })
  }
}

function addConfigInsights(insights: Insight[], analysis: InstanceAnalysis, t: Messages): void {
  const { totals, reclaimableBytes } = analysis.configs

  if (totals.orphaned > 0) {
    insights.push({
      id: 'orphaned-configs',
      severity: totals.orphaned >= 10 || reclaimableBytes > 16 * 1024 * 1024 ? 'warning' : 'info',
      title: t.insights.orphanedConfigsTitle(totals.orphaned),
      detail: t.insights.orphanedConfigsDetail(formatBytes(reclaimableBytes, t))
    })
  }

  if (totals.inactive > 0) {
    insights.push({
      id: 'inactive-configs',
      severity: 'info',
      title: t.insights.inactiveConfigsTitle(totals.inactive),
      detail: t.insights.inactiveConfigsDetail
    })
  }
}

function addDisabledModInsight(insights: Insight[], analysis: InstanceAnalysis, t: Messages): void {
  const disabled = analysis.mods.mods.filter((mod) => !mod.enabled)
  if (disabled.length === 0) return

  insights.push({
    id: 'disabled-mods',
    severity: 'info',
    title: t.insights.disabledModsTitle(disabled.length),
    detail: t.insights.disabledModsDetail(formatBytes(analysis.mods.disabledBytes, t))
  })
}

function addUnidentifiedInsight(insights: Insight[], analysis: InstanceAnalysis, t: Messages): void {
  const unidentified = analysis.mods.mods.filter((mod) => mod.parseError !== null)
  if (unidentified.length === 0) return

  insights.push({
    id: 'unidentified-mods',
    severity: 'info',
    title: t.insights.unidentifiedModsTitle(unidentified.length),
    detail: t.insights.unidentifiedModsDetail
  })
}

function addStorageInsights(insights: Insight[], storage: StorageReport | null, t: Messages): void {
  if (!storage) return

  const disposable = storage.byCategory
    .filter((entry) => entry.category === 'logs' || entry.category === 'crashes' || entry.category === 'cache')
    .reduce((sum, entry) => sum + entry.sizeBytes, 0)

  if (disposable > 200 * 1024 * 1024) {
    insights.push({
      id: 'disposable-storage',
      severity: 'warning',
      title: t.insights.disposableStorageTitle(formatBytes(disposable, t)),
      detail: t.insights.disposableStorageDetail
    })
  }
}

function severityRank(severity: InsightSeverity): number {
  switch (severity) {
    case 'critical':
      return 0
    case 'serious':
      return 1
    case 'warning':
      return 2
    case 'good':
      return 3
    case 'info':
      return 4
  }
}
