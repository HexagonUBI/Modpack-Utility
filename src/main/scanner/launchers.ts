import { homedir, platform } from 'node:os'
import { isAbsolute, join, resolve } from 'node:path'
import type { LauncherKind } from '@shared/types'
import { isDirectory, readKeyValueFile } from './fsutil'

export interface KnownRoot {
  launcher: LauncherKind
  path: string

  kind: 'container' | 'single'
}

interface RootCandidate extends KnownRoot {
  redirect?: { configPath: string; key: string; relativeTo: string }
}

export async function knownLauncherRoots(): Promise<KnownRoot[]> {
  const candidates = candidatesForPlatform()
  const found: KnownRoot[] = []
  const seen = new Set<string>()

  for (const candidate of candidates) {
    const path = candidate.redirect ? await applyRedirect(candidate) : candidate.path
    const key = path.toLowerCase()
    if (seen.has(key)) continue
    if (!(await isDirectory(path))) continue
    seen.add(key)
    found.push({ launcher: candidate.launcher, path, kind: candidate.kind })
  }

  return found
}

async function applyRedirect(candidate: RootCandidate): Promise<string> {
  const redirect = candidate.redirect!
  const config = await readKeyValueFile(redirect.configPath)
  const configured = config.get(redirect.key)
  if (!configured) return candidate.path
  return isAbsolute(configured) ? configured : resolve(redirect.relativeTo, configured)
}

function candidatesForPlatform(): RootCandidate[] {
  switch (platform()) {
    case 'win32':
      return windowsCandidates()
    case 'darwin':
      return macCandidates()
    default:
      return linuxCandidates()
  }
}

function windowsCandidates(): RootCandidate[] {
  const home = homedir()
  const appData = process.env.APPDATA || join(home, 'AppData', 'Roaming')
  const localAppData = process.env.LOCALAPPDATA || join(home, 'AppData', 'Local')

  const prismData = join(appData, 'PrismLauncher')
  const multiMcData = join(appData, 'MultiMC')

  return [
    {
      launcher: 'prism',
      path: join(prismData, 'instances'),
      kind: 'container',
      redirect: { configPath: join(prismData, 'prismlauncher.cfg'), key: 'InstanceDir', relativeTo: prismData }
    },
    {
      launcher: 'multimc',
      path: join(multiMcData, 'instances'),
      kind: 'container',
      redirect: { configPath: join(multiMcData, 'multimc.cfg'), key: 'InstanceDir', relativeTo: multiMcData }
    },
    { launcher: 'curseforge', path: join(home, 'curseforge', 'minecraft', 'Instances'), kind: 'container' },
    { launcher: 'curseforge', path: join(home, 'Documents', 'curseforge', 'minecraft', 'Instances'), kind: 'container' },
    { launcher: 'curseforge', path: join(home, 'OneDrive', 'Documents', 'curseforge', 'minecraft', 'Instances'), kind: 'container' },
    { launcher: 'modrinth', path: join(appData, 'ModrinthApp', 'profiles'), kind: 'container' },
    { launcher: 'modrinth', path: join(appData, 'com.modrinth.theseus', 'profiles'), kind: 'container' },
    { launcher: 'atlauncher', path: join(appData, 'ATLauncher', 'instances'), kind: 'container' },
    { launcher: 'gdlauncher', path: join(appData, 'gdlauncher_next', 'data', 'instances'), kind: 'container' },
    { launcher: 'gdlauncher', path: join(appData, 'gdlauncher_carbon', 'data', 'instances'), kind: 'container' },
    { launcher: 'ftb', path: join(home, '.ftba', 'instances'), kind: 'container' },
    { launcher: 'technic', path: join(appData, '.technic', 'modpacks'), kind: 'container' },
    { launcher: 'vanilla', path: join(appData, '.minecraft'), kind: 'single' },
    { launcher: 'vanilla', path: join(localAppData, 'Packages', 'Microsoft.4297127D64EC6_8wekyb3d8bbwe', 'LocalCache', 'Local', '.minecraft'), kind: 'single' }
  ]
}

function macCandidates(): RootCandidate[] {
  const home = homedir()
  const appSupport = join(home, 'Library', 'Application Support')
  const prismData = join(appSupport, 'PrismLauncher')

  return [
    {
      launcher: 'prism',
      path: join(prismData, 'instances'),
      kind: 'container',
      redirect: { configPath: join(prismData, 'prismlauncher.cfg'), key: 'InstanceDir', relativeTo: prismData }
    },
    { launcher: 'multimc', path: join(appSupport, 'MultiMC', 'instances'), kind: 'container' },
    { launcher: 'curseforge', path: join(home, 'curseforge', 'minecraft', 'Instances'), kind: 'container' },
    { launcher: 'modrinth', path: join(appSupport, 'ModrinthApp', 'profiles'), kind: 'container' },
    { launcher: 'modrinth', path: join(appSupport, 'com.modrinth.theseus', 'profiles'), kind: 'container' },
    { launcher: 'atlauncher', path: join(appSupport, 'ATLauncher', 'instances'), kind: 'container' },
    { launcher: 'ftb', path: join(home, '.ftba', 'instances'), kind: 'container' },
    { launcher: 'vanilla', path: join(appSupport, 'minecraft'), kind: 'single' }
  ]
}

function linuxCandidates(): RootCandidate[] {
  const home = homedir()
  const dataHome = process.env.XDG_DATA_HOME || join(home, '.local', 'share')
  const prismData = join(dataHome, 'PrismLauncher')
  const flatpakPrism = join(home, '.var', 'app', 'org.prismlauncher.PrismLauncher', 'data', 'PrismLauncher')

  return [
    {
      launcher: 'prism',
      path: join(prismData, 'instances'),
      kind: 'container',
      redirect: { configPath: join(prismData, 'prismlauncher.cfg'), key: 'InstanceDir', relativeTo: prismData }
    },
    {
      launcher: 'prism',
      path: join(flatpakPrism, 'instances'),
      kind: 'container',
      redirect: { configPath: join(flatpakPrism, 'prismlauncher.cfg'), key: 'InstanceDir', relativeTo: flatpakPrism }
    },
    { launcher: 'multimc', path: join(dataHome, 'multimc', 'instances'), kind: 'container' },
    { launcher: 'curseforge', path: join(home, 'curseforge', 'minecraft', 'Instances'), kind: 'container' },
    { launcher: 'modrinth', path: join(dataHome, 'ModrinthApp', 'profiles'), kind: 'container' },
    { launcher: 'modrinth', path: join(dataHome, 'com.modrinth.theseus', 'profiles'), kind: 'container' },
    { launcher: 'atlauncher', path: join(dataHome, 'ATLauncher', 'instances'), kind: 'container' },
    { launcher: 'gdlauncher', path: join(home, '.config', 'gdlauncher_next', 'data', 'instances'), kind: 'container' },
    { launcher: 'ftb', path: join(home, '.ftba', 'instances'), kind: 'container' },
    { launcher: 'vanilla', path: join(home, '.minecraft'), kind: 'single' }
  ]
}
