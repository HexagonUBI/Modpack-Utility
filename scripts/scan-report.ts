import { join } from 'node:path'
import { scanKnownLaunchers, scanUserFolder } from '../src/main/scanner/detect'
import { knownLauncherRoots } from '../src/main/scanner/launchers'
import { readMods } from '../src/main/scanner/mods'
import { readConfigs } from '../src/main/scanner/configs'

const DETAIL_LIMIT = Number(process.env['DETAIL_LIMIT'] ?? '3')

async function main(): Promise<void> {
  const target = process.argv[2]

  if (!target) {
    const roots = await knownLauncherRoots()
    console.log(`Launcher roots detected: ${roots.length}`)
    for (const root of roots) console.log(`  [${root.launcher}] ${root.path}`)
    console.log()
  }

  const instances = target ? await scanUserFolder(target) : await scanKnownLaunchers()
  console.log(`Instances detected: ${instances.length}\n`)

  for (const instance of instances) {
    const loader = instance.loader && instance.loader !== 'unknown' ? instance.loader : '-'
    console.log(
      `  ${instance.name.padEnd(38).slice(0, 38)} ${instance.launcher.padEnd(11)} ` +
        `mc ${(instance.minecraftVersion ?? '-').padEnd(9)} ${loader.padEnd(9)} ` +
        `${instance.iconDataUrl ? 'icon' : '    '}  ${instance.rootPath}`
    )
  }

  const sample = instances.filter((instance) => instance.launcher !== 'vanilla').slice(0, DETAIL_LIMIT)

  for (const instance of sample) {
    console.log(`\n--- ${instance.name} ---`)
    const started = Date.now()
    const mods = await readMods(join(instance.gameDir, 'mods'))
    const configs = await readConfigs(join(instance.gameDir, 'config'), mods.mods)

    const identified = mods.mods.filter((mod) => mod.modId !== null).length
    console.log(
      `mods: ${mods.mods.length} (${identified} identified, ` +
        `${mods.mods.filter((mod) => !mod.enabled).length} disabled) in ${Date.now() - started}ms`
    )
    console.log(`missing deps: ${mods.missingDependencies.map((entry) => entry.modId).join(', ') || 'none'}`)

    console.log(
      `conflicts: ${mods.conflicts.map((c) => `${c.declaredBy} vs ${c.modId}`).join(' | ') || 'none'}`
    )

    const installedIds = new Set(
      mods.mods.flatMap((mod) => [mod.modId, ...mod.provides]).filter(Boolean).map((id) => id!.toLowerCase())
    )
    const absentOptional = new Set(
      mods.mods
        .filter((mod) => mod.enabled)
        .flatMap((mod) => mod.dependencies)
        .filter((dep) => dep.kind === 'optional' && !installedIds.has(dep.modId.toLowerCase()))
        .map((dep) => dep.modId)
    )
    console.log(`optional deps not installed: ${absentOptional.size}`)
    console.log(
      `configs: ${configs.entries.length} - ` +
        Object.entries(configs.totals)
          .map(([status, count]) => `${status} ${count}`)
          .join(', ')
    )

    const orphaned = configs.entries.filter((entry) => entry.status === 'orphaned').slice(0, 8)
    if (orphaned.length > 0) {
      console.log(`unmatched: ${orphaned.map((entry) => entry.relativePath).join(', ')}`)
    }

    const lowConfidence = configs.entries
      .filter((entry) => entry.confidence > 0 && entry.confidence < 0.8)
      .slice(0, 5)
    if (lowConfidence.length > 0) {
      console.log(
        `low confidence: ${lowConfidence
          .map((entry) => `${entry.relativePath} -> ${entry.ownerModId} (${Math.round(entry.confidence * 100)}%)`)
          .join(', ')}`
      )
    }
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
