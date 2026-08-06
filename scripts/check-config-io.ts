import { copyFile, mkdtemp, readFile, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { readConfigDocument, writeConfigChanges } from '../src/main/scanner/configFile'
import { isFile } from '../src/main/scanner/fsutil'
import type { SettingValue } from '@shared/types'

let failures = 0

function check(label: string, condition: boolean, detail = ''): void {
  console.log(`${condition ? 'ok  ' : 'FAIL'} ${label}${detail ? ` - ${detail}` : ''}`)
  if (!condition) failures++
}

async function roundTrip(original: string, workDir: string): Promise<void> {
  const copy = join(workDir, basename(original))
  await copyFile(original, copy)

  const before = await readFile(copy, 'utf8')
  const document = await readConfigDocument(copy)

  console.log(`\n--- ${basename(original)} (${document.format}) ---`)
  if (document.unsupportedReason) {
    console.log(`skipped: ${document.unsupportedReason}`)
    return
  }
  check('found settings', document.settings.length > 0, `${document.settings.length}`)

  const target =
    document.settings.find((s) => s.kind === 'boolean') ??
    document.settings.find((s) => s.kind === 'integer') ??
    document.settings[0]
  if (!target) return

  const next: SettingValue =
    target.kind === 'boolean'
      ? !(target.value as boolean)
      : target.kind === 'integer'
        ? (target.value as number) + 1
        : `${String(target.value)}x`

  const result = await writeConfigChanges(copy, [{ key: target.key, value: next }])
  check('write reported success', result.ok, result.error ?? '')

  const after = await readFile(copy, 'utf8')
  check(
    'line count unchanged',
    before.split(/\r?\n/).length === after.split(/\r?\n/).length,
    `${before.split(/\r?\n/).length} vs ${after.split(/\r?\n/).length}`
  )
  check(
    'comments preserved',
    countComments(before) === countComments(after),
    `${countComments(before)} vs ${countComments(after)}`
  )
  check('file actually changed', before !== after)

  const reread = await readConfigDocument(copy)
  const updated = reread.settings.find((s) => s.key === target.key)
  check(
    `value round-tripped (${target.key})`,
    updated !== undefined && String(updated.value) === String(next),
    `wrote ${String(next)}, read back ${String(updated?.value)}`
  )

  const changedLines = before
    .split(/\r?\n/)
    .map((line, index) => (line === after.split(/\r?\n/)[index] ? null : index))
    .filter((index): index is number => index !== null)
  check('exactly one line changed', changedLines.length === 1, `lines ${changedLines.join(', ')}`)
}

function countComments(text: string): number {
  return text.split(/\r?\n/).filter((line) => /^\s*[#!]/.test(line)).length
}

async function findTomlConfig(): Promise<string | null> {
  const appData = process.env['APPDATA']
  if (!appData) return null

  const instances = join(appData, 'PrismLauncher', 'instances')
  for (const name of await readdir(instances).catch(() => [])) {
    for (const gameDir of ['minecraft', '.minecraft']) {
      const configDir = join(instances, name, gameDir, 'config')
      for (const file of await readdir(configDir).catch(() => [])) {
        if (file.toLowerCase().endsWith('.toml')) return join(configDir, file)
      }
    }
  }
  return null
}

async function main(): Promise<void> {
  const workDir = await mkdtemp(join(tmpdir(), 'mpu-config-'))
  console.log(`working in ${workDir}`)

  const options = join(process.env['APPDATA'] ?? '', '.minecraft', 'options.txt')
  if (await isFile(options)) await roundTrip(options, workDir)
  else console.log('no options.txt found, skipping')

  const toml = await findTomlConfig()
  if (toml) await roundTrip(toml, workDir)
  else console.log('no mod .toml config found, skipping')

  console.log(`\n${failures === 0 ? 'all checks passed' : `${failures} checks FAILED`}`)
  process.exitCode = failures === 0 ? 0 : 1
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
