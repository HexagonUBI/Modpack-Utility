import type { Instance, InstanceAnalysis, StorageReport } from '@shared/types'
import { formatBytes, formatMemory } from './format'

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
  storage: StorageReport | null
): Insight[] {
  const insights: Insight[] = []
  if (!analysis) return insights

  const enabledMods = analysis.mods.mods.filter((mod) => mod.enabled)
  const modCount = enabledMods.length

  addConflictInsight(insights, analysis)
  addDependencyInsights(insights, analysis)
  addMemoryInsights(insights, instance, modCount)
  addPerformanceModInsight(insights, enabledMods.map((mod) => mod.modId?.toLowerCase() ?? ''))
  addJavaArgInsights(insights, instance)
  addConfigInsights(insights, analysis)
  addDisabledModInsight(insights, analysis)
  addUnidentifiedInsight(insights, analysis)
  addStorageInsights(insights, storage)

  return insights.sort((a, b) => severityRank(a.severity) - severityRank(b.severity))
}

function addConflictInsight(insights: Insight[], analysis: InstanceAnalysis): void {
  const conflicts = analysis.mods.conflicts
  if (conflicts.length === 0) return

  insights.push({
    id: 'conflicts',
    severity: 'critical',
    title: `${conflicts.length} incompatible ${conflicts.length === 1 ? 'mod is' : 'mods are'} installed together`,
    detail: conflicts
      .map((conflict) => `${conflict.declaredBy} declares ${conflict.modId} incompatible`)
      .join('. '),
    focusModPath: analysis.mods.mods.find((mod) => mod.problems.conflictsWith.length > 0)?.filePath
  })
}

function addDependencyInsights(insights: Insight[], analysis: InstanceAnalysis): void {
  const missing = analysis.mods.missingDependencies
  if (missing.length === 0) return

  const disabled = missing.filter((entry) => entry.presentButDisabled)
  const absent = missing.filter((entry) => !entry.presentButDisabled)

  if (absent.length > 0) {
    insights.push({
      id: 'missing-dependencies',
      severity: 'critical',
      title: `${absent.length} required ${absent.length === 1 ? 'dependency is' : 'dependencies are'} missing`,
      detail: `The game will most likely refuse to start. Missing: ${absent
        .slice(0, 5)
        .map((entry) => entry.modId)
        .join(', ')}${absent.length > 5 ? `, and ${absent.length - 5} more` : ''}.`,
      focusModPath: analysis.mods.mods.find((mod) => mod.problems.missing.length > 0)?.filePath
    })
  }

  if (disabled.length > 0) {
    insights.push({
      id: 'disabled-dependencies',
      severity: 'serious',
      title: `${disabled.length} required ${disabled.length === 1 ? 'dependency is' : 'dependencies are'} disabled`,
      detail: `Present in the mods folder but switched off: ${disabled
        .map((entry) => entry.modId)
        .join(', ')}. Re-enable them or remove what depends on them.`,
      focusModPath: analysis.mods.mods.find((mod) => mod.problems.disabledDependencies.length > 0)
        ?.filePath
    })
  }
}

function addMemoryInsights(insights: Insight[], instance: Instance, modCount: number): void {
  const maxMb = instance.memory?.maxMb ?? null

  if (maxMb === null) {
    insights.push({
      id: 'memory-default',
      severity: 'info',
      title: 'Memory is left at the launcher default',
      detail:
        modCount > 100
          ? `With ${modCount} mods installed, setting an explicit allocation is worth doing - the default is usually well under what this pack needs.`
          : 'Set an explicit allocation in your launcher if you hit stutter or out-of-memory crashes.'
    })
    return
  }

  if (modCount > 150 && maxMb < 4096) {
    insights.push({
      id: 'memory-low',
      severity: 'serious',
      title: `${formatMemory(maxMb)} is likely too little for ${modCount} mods`,
      detail: 'Expect frequent garbage collection stutter and possible out-of-memory crashes. 6 GB is a reasonable starting point for a pack this size.'
    })
    return
  }

  if (maxMb > 12288 || (maxMb > 8192 && modCount < 250)) {
    insights.push({
      id: 'memory-high',
      severity: 'warning',
      title: `${formatMemory(maxMb)} is more than this pack needs`,
      detail:
        'Over-allocating does not make Minecraft faster - it makes each garbage collection pause longer, which is felt as periodic freezes. 6-8 GB suits almost every pack.'
    })
  }
}

function addPerformanceModInsight(insights: Insight[], enabledIds: string[]): void {
  const installed = enabledIds.filter((id) => PERFORMANCE_MOD_IDS.has(id))

  if (installed.length === 0) {
    insights.push({
      id: 'no-performance-mods',
      severity: 'warning',
      title: 'No performance mods detected',
      detail:
        'Adding a renderer replacement (Sodium on Fabric, Embeddium on Forge/NeoForge) plus FerriteCore and ModernFix typically gives the largest single improvement in frame time and memory use.'
    })
    return
  }

  insights.push({
    id: 'performance-mods',
    severity: 'good',
    title: `${installed.length} performance ${installed.length === 1 ? 'mod' : 'mods'} active`,
    detail: installed.join(', ')
  })
}

function addJavaArgInsights(insights: Insight[], instance: Instance): void {
  const args = instance.javaArgs
  if (!args) return

  const obsolete = OBSOLETE_GC_FLAGS.filter((flag) => args.includes(flag))
  if (obsolete.length > 0) {
    insights.push({
      id: 'obsolete-gc',
      severity: 'serious',
      title: 'Java arguments reference a garbage collector that no longer exists',
      detail: `${obsolete.join(', ')} was removed from the JVM. Modern Minecraft ships with a Java version that will refuse to start with these flags. Remove them and let G1 handle it.`
    })
  }
}

function addConfigInsights(insights: Insight[], analysis: InstanceAnalysis): void {
  const { totals, reclaimableBytes } = analysis.configs

  if (totals.orphaned > 0) {
    insights.push({
      id: 'orphaned-configs',
      severity: totals.orphaned >= 10 || reclaimableBytes > 16 * 1024 * 1024 ? 'warning' : 'info',
      title: `${totals.orphaned} config ${totals.orphaned === 1 ? 'entry matches' : 'entries match'} no installed mod`,
      detail: `Left behind when mods were removed, holding ${formatBytes(reclaimableBytes)}. Beyond the disk space, config left in place is still read at startup and can slow launches and cause hitching. The Configs tab can select and bin them in bulk; check anything marked low confidence first, since a few mods name their config differently from their id.`
    })
  }

  if (totals.inactive > 0) {
    insights.push({
      id: 'inactive-configs',
      severity: 'info',
      title: `${totals.inactive} config ${totals.inactive === 1 ? 'entry belongs' : 'entries belong'} to a disabled mod`,
      detail: 'Keep them if you plan to re-enable the mod - your settings are in there.'
    })
  }
}

function addDisabledModInsight(insights: Insight[], analysis: InstanceAnalysis): void {
  const disabled = analysis.mods.mods.filter((mod) => !mod.enabled)
  if (disabled.length === 0) return

  insights.push({
    id: 'disabled-mods',
    severity: 'info',
    title: `${disabled.length} disabled ${disabled.length === 1 ? 'mod is' : 'mods are'} still on disk`,
    detail: `They do not affect performance, but they hold ${formatBytes(analysis.mods.disabledBytes)}.`
  })
}

function addUnidentifiedInsight(insights: Insight[], analysis: InstanceAnalysis): void {
  const unidentified = analysis.mods.mods.filter((mod) => mod.parseError !== null)
  if (unidentified.length === 0) return

  insights.push({
    id: 'unidentified-mods',
    severity: 'info',
    title: `${unidentified.length} ${unidentified.length === 1 ? 'jar carries' : 'jars carry'} no readable mod metadata`,
    detail:
      'Normal for libraries and coremods, which are loaded by name rather than by manifest. They are listed on the Mods tab so you can check nothing unexpected is there.'
  })
}

function addStorageInsights(insights: Insight[], storage: StorageReport | null): void {
  if (!storage) return

  const disposable = storage.byCategory
    .filter((entry) => entry.category === 'logs' || entry.category === 'crashes' || entry.category === 'cache')
    .reduce((sum, entry) => sum + entry.sizeBytes, 0)

  if (disposable > 200 * 1024 * 1024) {
    insights.push({
      id: 'disposable-storage',
      severity: 'warning',
      title: `${formatBytes(disposable)} of logs, crash reports and caches`,
      detail: 'All of it is regenerated by the game. Clearing it is the safest space you can reclaim.'
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
