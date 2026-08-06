import { createContext, useContext } from 'react'
import type {
  AccentName,
  ConfigStatus,
  ConfigUnsupportedReason,
  ConfigWriteError,
  LauncherKind,
  LoaderKind,
  ModLoaderType
} from '@shared/types'
import type { VizGroup } from './viz'

export type Locale = 'en' | 'ru' | 'uk'

function slavicPlural(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

export interface Messages {
  appName: string
  launchers: Record<LauncherKind, string>
  loaders: Record<ModLoaderType | LoaderKind, string>
  accents: Record<AccentName, string>
  configStatus: Record<ConfigStatus, string>
  storageGroups: Record<VizGroup, string>
  units: {
    bytes: string
    kilobytes: string
    megabytes: string
    gigabytes: string
    terabytes: string
  }
  date: {
    never: string
    unknown: string
    today: string
    yesterday: string
    daysAgo: (days: number) => string
  }
  nav: {
    overview: string
    searchInstances: string
    rescan: string
    addFolder: string
    pickFolderTitle: string
    settings: string
    lightTheme: string
    darkTheme: string
    noInstances: string
    noInstancesHint: string
    lookingForInstances: string
    versionUnknown: string
  }
  home: {
    title: string
    subtitle: (instances: number, launchers: number) => string
    instances: string
    instancesHint: string
    launchers: string
    launchersHint: string
    versions: string
    versionsHint: string
    totalOnDisk: string
    notMeasured: string
    measureToFillIn: string
    files: (count: number) => string
    whereSpaceGoes: string
    measureAll: string
    reMeasure: string
    measuring: string
    measureBlurb: string
    acrossAllInstances: string
    smallerInstances: (count: number) => string
    byLauncher: string
    instancesUnit: string
    recentlyPlayed: string
    noRecent: string
  }
  tabs: {
    overview: string
    mods: string
    dependencies: string
    configs: string
    storage: string
    resourcePacks: string
    screenshots: string
  }
  common: {
    cancel: string
    save: string
    saving: string
    close: string
    open: string
    clearSelection: string
    showInFolder: string
    openFile: string
    editSettings: string
    search: string
    nothingMatches: string
    tryDifferentSearch: string
    selected: (count: number, size: string) => string
    moveToRecycleBin: string
    size: string
    files: string
    fileCount: (count: number) => string
    name: string
    status: string
    version: string
    loader: string
    enabled: string
    disabled: string
    all: string
    unknown: string
    noneSet: string
    launcherDefault: string
    server: string
    expand: (name: string) => string
    collapse: (name: string) => string
    showMore: (remaining: number) => string
  }
  settings: {
    title: string
    theme: string
    themeDetail: string
    followSystem: string
    light: string
    dark: string
    accent: string
    accentDetail: string
    language: string
    languageDetail: string
    incompleteLanguage: string
    extraFolders: string
    extraFoldersDetail: string
    noExtraFolders: string
    stopScanning: string
    deleting: string
    deletingDetail: string
    recycleBinOnly: string
  }
  overview: {
    activeMods: string
    modsDisabled: (count: number) => string
    modsFolder: string
    configEntries: string
    configsMatchNoMod: (count: number) => string
    instanceSize: string
    openStorageTab: string
    details: string
    launcher: string
    minecraft: string
    modLoader: string
    memory: string
    memoryWithMinimum: (maximum: string, minimum: string) => string
    javaArguments: string
    lastPlayed: string
    instanceFolder: string
    gameFolder: string
  }
  storage: {
    measureTitle: string
    measureDetail: string
    measureNow: string
    reMeasure: string
    measuringFiles: string
    filesMeasuredIn: (files: string, seconds: string) => string
    share: string
    truncatedNote: string
    openAsOwnView: string
    legendEntry: (group: string, size: string) => string
    moreItems: (count: number) => string
  }
  configs: {
    matchedToMod: string
    configInUse: string
    disabledMod: string
    settingsKept: string
    noMatchingMod: string
    reclaimable: (size: string) => string
    loaderAndSystem: string
    notOwned: string
    quickSelect: string
    presetOrphaned: string
    presetOrphanedHint: string
    presetInactive: string
    presetInactiveHint: string
    presetUncertain: string
    presetUncertainHint: string
    presetBackups: string
    presetBackupsHint: string
    presetWithCount: (label: string, count: number) => string
    searchConfigs: string
    filterActive: string
    filterUnmatched: string
    filterSystem: string
    selectAllShown: string
    config: string
    belongsTo: string
    confidence: string
    sure: (percent: number) => string
    noMatch: string
    gameOptionsDetail: string
    noConfigFolder: string
    noConfigFolderDetail: string
    modsWithoutConfig: (count: number) => string
    modsWithoutConfigDetail: string
    purgeTitle: (count: number) => string
    purgeDetail: (size: string) => string
    purgeEntry: (path: string, owner: string | null) => string
    purgeOwnedWarning: string
  }
  configEditor: {
    fallbackTitle: string
    unsaved: (count: number) => string
    searchOptions: string
    nothingMatchesSearch: string
    openAsText: string
    openInEditor: string
    onePerLine: string
    saved: (count: number) => string
    readFailed: string
    saveFailed: string
    unsupported: Record<ConfigUnsupportedReason, string>
    writeError: Record<ConfigWriteError, string>
  }
  configReason: {
    system: string
    noMods: string
    noMatch: string
    exactModId: (modId: string) => string
    namedAfterModId: (modId: string) => string
    normalisedModId: (modId: string) => string
    bundledConfig: (modName: string) => string
    modName: (modName: string) => string
    fileName: (modName: string) => string
    initials: (candidate: string, modName: string) => string
    containsModId: (modId: string) => string
    shortenedModId: (modId: string) => string
  }
  mods: {
    searchMods: string
    allWithCount: (count: number) => string
    unidentified: string
    mod: string
    requires: string
    worksWith: string
    incompatibleWith: string
    authors: string
    runsOn: string
    alsoProvides: string
    file: string
    clientOnly: string
    serverOnly: string
    clientAndServer: string
    noModsFolder: string
    noModsFolderDetail: string
    noManifest: (reason: string) => string
  }
  dependencies: {
    withRequirements: string
    ofInstalled: (count: number) => string
    unmet: string
    unmetCount: (count: number) => string
    neededBy: (modId: string, presentButDisabled: boolean, requiredBy: string) => string
    nothingMissing: string
    listedBelow: string
    conflicts: string
    conflictSummary: (declaredBy: string, modId: string) => string
    conflictSentence: (
      declaredBy: string,
      modId: string,
      versionRange: string | null,
      installedVersion: string | null
    ) => string
    noneDeclared: string
    excludeEachOther: string
    wholeInstance: string
    oneMod: string
    highlight: string
    showDependenciesFor: string
    installed: string
    missing: string
    missingChip: (modId: string, presentButDisabled: boolean) => string
    installedButDisabled: string
    optional: string
    includeOptionalLinks: string
    showAbsentOptional: (hidden: number) => string
    hoverHint: string
    nothingRequiresThis: string
    requiresNothing: string
    unmetTitle: string
    unmetHint: string
    declaredConflicts: string
    noMods: string
    noModsDetail: string
  }
  graph: {
    dependenciesOf: (name: string) => string
    dependencyMapOf: (count: number) => string
    nothingToDraw: string
    notInModsFolder: string
    optionalDependency: string
    requiresThis: string
    missingList: (ids: string) => string
    disabledDependencyList: (ids: string) => string
    incompatibleList: (ids: string) => string
    modIsDisabled: string
    zoomIn: string
    zoomOut: string
    fitToView: string
  }
  chart: {
    sizeBreakdownOf: (name: string) => string
    shareOfFolder: (size: string, percent: string) => string
    clickToOpen: string
  }
  packs: {
    installed: string
    packsOnDisk: string
    active: string
    loaded: (size: string) => string
    notInUse: string
    idle: (size: string) => string
    totalSize: string
    wholeFolder: string
    selectInactive: (count: number) => string
    activeAt: (position: number) => string
    turnOnInGame: string
    turnOffInGame: string
    enablePack: (name: string) => string
    folder: string
    noFolder: string
    noFolderDetail: string
    noneInstalled: string
    noneInstalledDetail: string
    purgeTitle: (count: number) => string
    purgeDetail: (size: string) => string
    purgeEntry: (name: string, active: boolean) => string
    activeWarning: string
  }
  screenshots: {
    count: string
    inThisInstance: string
    totalSize: string
    wholeFolder: string
    olderThanSixMonths: string
    selectOld: (count: number) => string
    selectLarge: (count: number) => string
    selectOne: (name: string) => string
    newest: string
    oldest: string
    largest: string
    none: string
    noneDetail: string
    openFullSize: string
    purgeTitle: (count: number) => string
    purgeDetail: (size: string) => string
  }
  insights: {
    heading: string
    critical: string
    serious: string
    warning: string
    good: string
    info: string
    conflictsTitle: (count: number) => string
    missingDependenciesTitle: (count: number) => string
    missingDependenciesDetail: (ids: string, extra: number) => string
    disabledDependenciesTitle: (count: number) => string
    disabledDependenciesDetail: (ids: string) => string
    memoryDefaultTitle: string
    memoryDefaultManyMods: (count: number) => string
    memoryDefaultDetail: string
    memoryLowTitle: (memory: string, count: number) => string
    memoryLowDetail: string
    memoryHighTitle: (memory: string) => string
    memoryHighDetail: string
    noPerformanceModsTitle: string
    noPerformanceModsDetail: string
    performanceModsTitle: (count: number) => string
    obsoleteGcTitle: string
    obsoleteGcDetail: (flags: string) => string
    orphanedConfigsTitle: (count: number) => string
    orphanedConfigsDetail: (size: string) => string
    inactiveConfigsTitle: (count: number) => string
    inactiveConfigsDetail: string
    disabledModsTitle: (count: number) => string
    disabledModsDetail: (size: string) => string
    unidentifiedModsTitle: (count: number) => string
    unidentifiedModsDetail: string
    disposableStorageTitle: (size: string) => string
    disposableStorageDetail: string
  }
  progress: {
    checkingLauncher: (launcher: string) => string
    measuringInstance: (name: string, current: number, total: number) => string
    walkingFiles: (path: string, files: string) => string
  }
  loading: {
    mods: string
    dependencies: string
    configs: string
    packs: string
    screenshots: string
  }
  notices: {
    instancesAdded: (count: number) => string
    movedToBin: (count: number) => string
    movedPartly: (moved: number, failed: number, detail: string | null) => string
    scanFailed: string
    folderFailed: string
    measureAllFailed: string
    measureFailed: string
    purgeFailed: string
    modToggleFailed: string
    packToggleFailed: string
    modFileExists: (name: string) => string
    noOptionsFile: string
    analysisFailed: (detail: string) => string
  }
}

const en: Messages = {
  appName: 'Modpack Utility',
  launchers: {
    prism: 'Prism Launcher',
    multimc: 'MultiMC',
    curseforge: 'CurseForge',
    modrinth: 'Modrinth',
    atlauncher: 'ATLauncher',
    gdlauncher: 'GDLauncher',
    ftb: 'FTB App',
    technic: 'Technic',
    vanilla: 'Vanilla Launcher',
    server: 'Dedicated Server',
    custom: 'Unrecognised'
  },
  loaders: {
    neoforge: 'NeoForge',
    forge: 'Forge',
    'legacy-forge': 'Forge (legacy)',
    fabric: 'Fabric',
    quilt: 'Quilt',
    vanilla: 'Vanilla',
    unknown: 'Unknown'
  },
  accents: {
    red: 'Red',
    green: 'Green',
    blue: 'Blue',
    violet: 'Violet',
    amber: 'Amber',
    slate: 'Slate'
  },
  configStatus: {
    owned: 'Active mod',
    inactive: 'Disabled mod',
    orphaned: 'No matching mod',
    system: 'Loader / system',
    unmatched: 'Unattributed'
  },
  storageGroups: {
    mods: 'Mods',
    saves: 'Worlds',
    resourcepacks: 'Resource packs',
    shaderpacks: 'Shader packs',
    maps: 'Map data',
    backups: 'Backups',
    cache: 'Caches',
    logs: 'Logs and crashes',
    other: 'Other'
  },
  units: {
    bytes: 'B',
    kilobytes: 'KB',
    megabytes: 'MB',
    gigabytes: 'GB',
    terabytes: 'TB'
  },
  date: {
    never: 'Never',
    unknown: 'Unknown',
    today: 'Today',
    yesterday: 'Yesterday',
    daysAgo: (days) => `${days} days ago`
  },
  nav: {
    overview: 'Overview',
    searchInstances: 'Search instances...',
    rescan: 'Rescan',
    addFolder: 'Add folder',
    pickFolderTitle: 'Select an instance, or a launcher folder containing instances',
    settings: 'Settings',
    lightTheme: 'Switch to light theme',
    darkTheme: 'Switch to dark theme',
    noInstances: 'No instances found',
    noInstancesHint:
      'Portable launcher installs live outside the usual folders. Add yours manually and it will be detected the same way.',
    lookingForInstances: 'Looking for instances...',
    versionUnknown: 'Version unknown'
  },
  home: {
    title: 'Overview',
    subtitle: (instances, launchers) =>
      `${instances} ${instances === 1 ? 'instance' : 'instances'} across ${launchers} ${
        launchers === 1 ? 'launcher' : 'launchers'
      }.`,
    instances: 'Instances',
    instancesHint: 'detected on this machine',
    launchers: 'Launchers',
    launchersHint: 'with instances installed',
    versions: 'Minecraft versions',
    versionsHint: 'distinct across instances',
    totalOnDisk: 'Total on disk',
    notMeasured: 'Not measured',
    measureToFillIn: 'Measure to fill in',
    files: (count) => `${count.toLocaleString('en-US')} files`,
    whereSpaceGoes: 'Where the space goes',
    measureAll: 'Measure all instances',
    reMeasure: 'Re-measure',
    measuring: 'Measuring instances...',
    measureBlurb:
      'Walks every instance to show which ones are actually taking the space. Takes a few seconds across a large library.',
    acrossAllInstances: 'across all instances',
    smallerInstances: (count) => `${count} smaller instances`,
    byLauncher: 'By launcher',
    instancesUnit: 'instances',
    recentlyPlayed: 'Recently played',
    noRecent: 'No launcher recorded a last-played time for these instances.'
  },
  tabs: {
    overview: 'Overview',
    mods: 'Mods',
    dependencies: 'Dependencies',
    configs: 'Configs',
    storage: 'Storage',
    resourcePacks: 'Resource packs',
    screenshots: 'Screenshots'
  },
  common: {
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving...',
    close: 'Close',
    open: 'Open',
    clearSelection: 'Clear selection',
    showInFolder: 'Show in folder',
    openFile: 'Open file',
    editSettings: 'Edit settings',
    search: 'Search',
    nothingMatches: 'Nothing matches',
    tryDifferentSearch: 'Try a different search term or filter.',
    selected: (count, size) => `${count} selected, ${size}`,
    moveToRecycleBin: 'Move to recycle bin',
    size: 'Size',
    files: 'Files',
    fileCount: (count) => `${count} ${count === 1 ? 'file' : 'files'}`,
    name: 'Name',
    status: 'Status',
    version: 'Version',
    loader: 'Loader',
    enabled: 'Enabled',
    disabled: 'Disabled',
    all: 'All',
    unknown: 'Unknown',
    noneSet: 'None set',
    launcherDefault: 'Launcher default',
    server: 'Server',
    expand: (name) => `Expand ${name}`,
    collapse: (name) => `Collapse ${name}`,
    showMore: (remaining) => `Show more (${remaining} remaining)`
  },
  settings: {
    title: 'Settings',
    theme: 'Theme',
    themeDetail: 'Following the system setting switches with Windows light and dark mode.',
    followSystem: 'Follow system',
    light: 'Light',
    dark: 'Dark',
    accent: 'Accent colour',
    accentDetail:
      'Used for buttons, tabs and links. The storage charts keep their own palette, which is chosen for colour-vision accessibility rather than taste.',
    language: 'Language',
    languageDetail: 'Changes apply immediately. Mod names and config keys stay as the mod author wrote them.',
    incompleteLanguage: 'incomplete',
    extraFolders: 'Extra folders to scan',
    extraFoldersDetail:
      'Checked on every scan alongside the default launcher locations. Folders added with the Add folder button are remembered here.',
    noExtraFolders: 'None. The usual launcher folders are always scanned.',
    stopScanning: 'Stop scanning this folder',
    deleting: 'Deleting files',
    deletingDetail:
      'Everything this app removes goes to the recycle bin, never a permanent delete. Config attribution is a heuristic, so a purge has to be reversible. There is deliberately no option to change this.',
    recycleBinOnly: 'Recycle bin only.'
  },
  overview: {
    activeMods: 'Active mods',
    modsDisabled: (count) => `${count} disabled`,
    modsFolder: 'Mods folder',
    configEntries: 'Config entries',
    configsMatchNoMod: (count) => `${count} match no mod`,
    instanceSize: 'Instance size',
    openStorageTab: 'Open the Storage tab',
    details: 'Details',
    launcher: 'Launcher',
    minecraft: 'Minecraft',
    modLoader: 'Mod loader',
    memory: 'Memory',
    memoryWithMinimum: (maximum, minimum) => `${maximum} (min ${minimum})`,
    javaArguments: 'Java arguments',
    lastPlayed: 'Last played',
    instanceFolder: 'Instance folder',
    gameFolder: 'Game folder'
  },
  storage: {
    measureTitle: 'Measure this instance',
    measureDetail:
      'Walks every file to show exactly where the space went, the way WizTree does. Large instances with big worlds can take a few seconds.',
    measureNow: 'Measure now',
    reMeasure: 'Re-measure',
    measuringFiles: 'Measuring files...',
    filesMeasuredIn: (files, seconds) => `${files} files measured in ${seconds}s`,
    share: 'Share',
    truncatedNote:
      'Very deep or very wide folders are grouped for display. All sizes shown are exact totals.',
    openAsOwnView: 'Open as its own view',
    legendEntry: (group, size) => `${group} - ${size}`,
    moreItems: (count) => `${count} more items not shown. Use Show in folder to see them all.`
  },
  configs: {
    matchedToMod: 'Matched to a mod',
    configInUse: 'Config is in use',
    disabledMod: 'Disabled mod',
    settingsKept: 'Settings kept for later',
    noMatchingMod: 'No matching mod',
    reclaimable: (size) => `${size} reclaimable`,
    loaderAndSystem: 'Loader and system',
    notOwned: 'Not owned by any mod',
    quickSelect: 'Quick select',
    presetOrphaned: 'No matching mod',
    presetOrphanedHint: 'Config left behind by mods that are no longer installed',
    presetInactive: 'From disabled mods',
    presetInactiveHint:
      'Settings for mods that are present but switched off. Keep these if you plan to re-enable them',
    presetUncertain: 'Uncertain matches',
    presetUncertainHint: 'Attributed to a mod, but with low confidence. Worth reviewing by hand',
    presetBackups: 'Backups and .old files',
    presetBackupsHint: 'Superseded copies the mods themselves left behind',
    presetWithCount: (label, count) => `${label} (${count})`,
    searchConfigs: 'Search configs...',
    filterActive: 'Active',
    filterUnmatched: 'Unmatched',
    filterSystem: 'System',
    selectAllShown: 'Select all shown configs',
    config: 'Config',
    belongsTo: 'Belongs to',
    confidence: 'Confidence',
    sure: (percent) => `${percent}% sure`,
    noMatch: 'No match',
    gameOptionsDetail: 'Minecraft video, audio and control settings for this instance',
    noConfigFolder: 'No config folder',
    noConfigFolderDetail:
      'Nothing has written configuration for this instance yet, which usually means it has never been launched.',
    modsWithoutConfig: (count) =>
      `${count} installed ${count === 1 ? 'mod has' : 'mods have'} no config of their own`,
    modsWithoutConfigDetail:
      'Perfectly normal. Many mods need no configuration, and some write into another mod folder.',
    purgeTitle: (count) => `Move ${count} config entries to the recycle bin?`,
    purgeDetail: (size) =>
      `This frees ${size}. Nothing is deleted permanently, so you can restore from the recycle bin if a mod turns out to have needed one of these.`,
    purgeEntry: (path, owner) => (owner ? `${path}  (${owner})` : path),
    purgeOwnedWarning:
      'Some of these belong to mods that are installed and enabled. Removing them resets those mods to their default settings.'
  },
  configEditor: {
    fallbackTitle: 'Config',
    unsaved: (count) => `${count} unsaved`,
    searchOptions: 'Search options...',
    nothingMatchesSearch: 'Nothing matches that search.',
    openAsText: 'Open as text',
    openInEditor: 'Open in the default editor',
    onePerLine: 'One per line',
    saved: (count) => `Saved ${count} ${count === 1 ? 'change' : 'changes'}.`,
    readFailed: 'The file could not be read.',
    saveFailed: 'The file could not be saved.',
    unsupported: {
      fileType: 'This file type is not editable here.',
      unreadable: 'The file could not be read.',
      tooLarge: 'The file is too large to edit here.',
      notUnderstood: 'The file could not be understood well enough to edit.',
      noOptions: 'No editable options were found in this file.',
      notSettings: 'This does not look like a settings file.'
    },
    writeError: {
      fileType: 'This file type cannot be edited.',
      unparsable: 'The file could not be parsed.',
      stale: 'Some options could not be saved because the file changed on disk. Reopen it and try again.',
      missingKeys: 'Some options no longer exist in this file.',
      failed: 'The file could not be saved.'
    }
  },
  configReason: {
    system: 'Belongs to the mod loader, not to a mod',
    noMods: 'No mods were found to compare against',
    noMatch: 'No installed mod matches this name - likely left behind by a removed mod',
    exactModId: (modId) => `Exactly matches mod id "${modId}"`,
    namedAfterModId: (modId) => `Named after mod id "${modId}"`,
    normalisedModId: (modId) => `Matches mod id "${modId}"`,
    bundledConfig: (modName) => `${modName} ships a default config with this name`,
    modName: (modName) => `Matches mod name "${modName}"`,
    fileName: (modName) => `Matches the filename of ${modName}`,
    initials: (candidate, modName) => `"${candidate}" is the initials of ${modName}`,
    containsModId: (modId) => `Name contains mod id "${modId}"`,
    shortenedModId: (modId) => `Shortened form of mod id "${modId}"`
  },
  mods: {
    searchMods: 'Search mods...',
    allWithCount: (count) => `All ${count}`,
    unidentified: 'Unidentified',
    mod: 'Mod',
    requires: 'Requires',
    worksWith: 'Works with (optional)',
    incompatibleWith: 'Incompatible with',
    authors: 'Authors',
    runsOn: 'Runs on',
    alsoProvides: 'Also provides',
    file: 'File',
    clientOnly: 'Client only',
    serverOnly: 'Server only',
    clientAndServer: 'Client and server',
    noModsFolder: 'No mods folder',
    noModsFolderDetail: 'This instance has no mods directory, so there is nothing to inspect here yet.',
    noManifest: (reason) => `No readable manifest (${reason}). This is normal for libraries and coremods.`
  },
  dependencies: {
    withRequirements: 'Mods with requirements',
    ofInstalled: (count) => `of ${count} installed`,
    unmet: 'Unmet requirements',
    unmetCount: (count) => `${count} unmet ${count === 1 ? 'dependency' : 'dependencies'}`,
    neededBy: (modId, presentButDisabled, requiredBy) =>
      `${modId}${presentButDisabled ? ' (present but disabled)' : ''} - needed by ${requiredBy}`,
    nothingMissing: 'Nothing is missing',
    listedBelow: 'Listed below',
    conflicts: 'Declared conflicts',
    conflictSummary: (declaredBy, modId) => `${declaredBy} declares ${modId} incompatible`,
    conflictSentence: (declaredBy, modId, versionRange, installedVersion) =>
      `${declaredBy} declares ${modId}${versionRange ? ` ${versionRange}` : ''} incompatible${
        installedVersion ? `, and ${installedVersion} is installed` : ''
      }.`,
    noneDeclared: 'None declared',
    excludeEachOther: 'Mods that exclude each other',
    wholeInstance: 'Whole instance',
    oneMod: 'One mod',
    highlight: 'Highlight',
    showDependenciesFor: 'Show dependencies for',
    installed: 'Installed',
    missing: 'Missing',
    missingChip: (modId, presentButDisabled) =>
      `${modId}${presentButDisabled ? ' (disabled)' : ''}`,
    installedButDisabled: 'Installed but disabled',
    optional: 'Optional',
    includeOptionalLinks: 'Include optional links',
    showAbsentOptional: (hidden) =>
      `Show optional mods that are not installed${hidden > 0 ? ` (${hidden} hidden)` : ''}`,
    hoverHint: 'Hover a mod to trace its dependencies. Drag to pan, scroll to zoom.',
    nothingRequiresThis: 'Nothing requires this',
    requiresNothing: 'Requires nothing else',
    unmetTitle: 'Unmet requirements',
    unmetHint: 'Click one to jump to the mod that asks for it.',
    declaredConflicts: 'Declared conflicts',
    noMods: 'No mods',
    noModsDetail: 'There is nothing to draw a dependency graph from.'
  },
  graph: {
    dependenciesOf: (name) => `Dependencies of ${name}`,
    dependencyMapOf: (count) => `Dependency map of ${count} mods`,
    nothingToDraw: 'No mods to draw.',
    notInModsFolder: 'Not present in the mods folder',
    optionalDependency: 'optional dependency',
    requiresThis: 'requires this',
    missingList: (ids) => `Missing: ${ids}`,
    disabledDependencyList: (ids) => `Disabled dependency: ${ids}`,
    incompatibleList: (ids) => `Incompatible with: ${ids}`,
    modIsDisabled: 'This mod is disabled',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    fitToView: 'Fit to view'
  },
  chart: {
    sizeBreakdownOf: (name) => `Size breakdown of ${name}`,
    shareOfFolder: (size, percent) => `${size} - ${percent} of this folder`,
    clickToOpen: 'click to open'
  },
  packs: {
    installed: 'Installed',
    packsOnDisk: 'packs on disk',
    active: 'Active',
    loaded: (size) => `${size} loaded`,
    notInUse: 'Not in use',
    idle: (size) => `${size} idle`,
    totalSize: 'Total size',
    wholeFolder: 'whole folder',
    selectInactive: (count) => `Select inactive (${count})`,
    activeAt: (position) => `Active #${position}`,
    turnOnInGame: 'Turn on in game',
    turnOffInGame: 'Turn off in game',
    enablePack: (name) => `Enable ${name}`,
    folder: 'Folder',
    noFolder: 'No resource packs folder',
    noFolderDetail: 'This instance has no resourcepacks directory yet.',
    noneInstalled: 'No resource packs installed',
    noneInstalledDetail:
      'Packs you add to the instance will be listed here with their size and load order.',
    purgeTitle: (count) => `Move ${count} resource packs to the recycle bin?`,
    purgeDetail: (size) => `This frees ${size}. Nothing is deleted permanently.`,
    purgeEntry: (name, active) => `${name}${active ? '  (currently active)' : ''}`,
    activeWarning:
      'Some of these are active in the game right now. Removing them changes how the instance looks.'
  },
  screenshots: {
    count: 'Screenshots',
    inThisInstance: 'in this instance',
    totalSize: 'Total size',
    wholeFolder: 'whole folder',
    olderThanSixMonths: 'Older than 6 months',
    selectOld: (count) => `Select older than 6 months (${count})`,
    selectLarge: (count) => `Select over 4 MB (${count})`,
    selectOne: (name) => `Select ${name}`,
    newest: 'Newest',
    oldest: 'Oldest',
    largest: 'Largest',
    none: 'No screenshots',
    noneDetail: 'Screenshots taken in this instance will show up here, with sizes and bulk cleanup.',
    openFullSize: 'Open full size',
    purgeTitle: (count) => `Move ${count} screenshots to the recycle bin?`,
    purgeDetail: (size) =>
      `This frees ${size}. Nothing is deleted permanently, so you can restore them from the recycle bin.`
  },
  insights: {
    heading: 'Health and performance',
    critical: 'Critical',
    serious: 'Needs attention',
    warning: 'Worth checking',
    good: 'Looking good',
    info: 'Note',
    conflictsTitle: (count) =>
      `${count} incompatible ${count === 1 ? 'mod is' : 'mods are'} installed together`,
    missingDependenciesTitle: (count) =>
      `${count} required ${count === 1 ? 'dependency is' : 'dependencies are'} missing`,
    missingDependenciesDetail: (ids, extra) =>
      `The game will most likely refuse to start. Missing: ${ids}${
        extra > 0 ? `, and ${extra} more` : ''
      }.`,
    disabledDependenciesTitle: (count) =>
      `${count} required ${count === 1 ? 'dependency is' : 'dependencies are'} disabled`,
    disabledDependenciesDetail: (ids) =>
      `Present in the mods folder but switched off: ${ids}. Re-enable them or remove what depends on them.`,
    memoryDefaultTitle: 'Memory is left at the launcher default',
    memoryDefaultManyMods: (count) =>
      `With ${count} mods installed, setting an explicit allocation is worth doing - the default is usually well under what this pack needs.`,
    memoryDefaultDetail:
      'Set an explicit allocation in your launcher if you hit stutter or out-of-memory crashes.',
    memoryLowTitle: (memory, count) => `${memory} is likely too little for ${count} mods`,
    memoryLowDetail:
      'Expect frequent garbage collection stutter and possible out-of-memory crashes. 6 GB is a reasonable starting point for a pack this size.',
    memoryHighTitle: (memory) => `${memory} is more than this pack needs`,
    memoryHighDetail:
      'Over-allocating does not make Minecraft faster - it makes each garbage collection pause longer, which is felt as periodic freezes. 6-8 GB suits almost every pack.',
    noPerformanceModsTitle: 'No performance mods detected',
    noPerformanceModsDetail:
      'Adding a renderer replacement (Sodium on Fabric, Embeddium on Forge/NeoForge) plus FerriteCore and ModernFix typically gives the largest single improvement in frame time and memory use.',
    performanceModsTitle: (count) => `${count} performance ${count === 1 ? 'mod' : 'mods'} active`,
    obsoleteGcTitle: 'Java arguments reference a garbage collector that no longer exists',
    obsoleteGcDetail: (flags) =>
      `${flags} was removed from the JVM. Modern Minecraft ships with a Java version that will refuse to start with these flags. Remove them and let G1 handle it.`,
    orphanedConfigsTitle: (count) =>
      `${count} config ${count === 1 ? 'entry matches' : 'entries match'} no installed mod`,
    orphanedConfigsDetail: (size) =>
      `Left behind when mods were removed, holding ${size}. Beyond the disk space, config left in place is still read at startup and can slow launches and cause hitching. The Configs tab can select and bin them in bulk; check anything marked low confidence first, since a few mods name their config differently from their id.`,
    inactiveConfigsTitle: (count) =>
      `${count} config ${count === 1 ? 'entry belongs' : 'entries belong'} to a disabled mod`,
    inactiveConfigsDetail: 'Keep them if you plan to re-enable the mod - your settings are in there.',
    disabledModsTitle: (count) =>
      `${count} disabled ${count === 1 ? 'mod is' : 'mods are'} still on disk`,
    disabledModsDetail: (size) => `They do not affect performance, but they hold ${size}.`,
    unidentifiedModsTitle: (count) =>
      `${count} ${count === 1 ? 'jar carries' : 'jars carry'} no readable mod metadata`,
    unidentifiedModsDetail:
      'Normal for libraries and coremods, which are loaded by name rather than by manifest. They are listed on the Mods tab so you can check nothing unexpected is there.',
    disposableStorageTitle: (size) => `${size} of logs, crash reports and caches`,
    disposableStorageDetail:
      'All of it is regenerated by the game. Clearing it is the safest space you can reclaim.'
  },
  progress: {
    checkingLauncher: (launcher) => `Checking ${launcher}`,
    measuringInstance: (name, current, total) => `${name} (${current} of ${total})`,
    walkingFiles: (path, files) => `${path} (${files} files)`
  },
  loading: {
    mods: 'Reading mod manifests...',
    dependencies: 'Resolving dependencies...',
    configs: 'Matching configs to mods...',
    packs: 'Reading resource packs...',
    screenshots: 'Listing screenshots...'
  },
  notices: {
    instancesAdded: (count) => `Added ${count} ${count === 1 ? 'instance' : 'instances'}.`,
    movedToBin: (count) => `Moved ${count} ${count === 1 ? 'item' : 'items'} to the recycle bin.`,
    movedPartly: (moved, failed, detail) =>
      `Moved ${moved}, could not move ${failed}.${detail ? ` ${detail}` : ''}`,
    scanFailed: 'The scan could not be completed.',
    folderFailed: 'Could not read that folder.',
    measureAllFailed: 'Could not measure the instances.',
    measureFailed: 'Could not measure this instance.',
    purgeFailed: 'Could not move those files.',
    modToggleFailed: 'Could not change that mod.',
    packToggleFailed: 'Could not change that resource pack.',
    modFileExists: (name) => `${name} already exists in the mods folder.`,
    noOptionsFile: 'This instance has no options.txt yet. Launch the game once and try again.',
    analysisFailed: (detail) => `Could not read this instance: ${detail}`
  }
}

const ru: Messages = {
  appName: 'Modpack Utility',
  launchers: {
    prism: 'Prism Launcher',
    multimc: 'MultiMC',
    curseforge: 'CurseForge',
    modrinth: 'Modrinth',
    atlauncher: 'ATLauncher',
    gdlauncher: 'GDLauncher',
    ftb: 'FTB App',
    technic: 'Technic',
    vanilla: 'Официальный лаунчер',
    server: 'Выделенный сервер',
    custom: 'Нераспознанный'
  },
  loaders: {
    neoforge: 'NeoForge',
    forge: 'Forge',
    'legacy-forge': 'Forge (устаревший)',
    fabric: 'Fabric',
    quilt: 'Quilt',
    vanilla: 'Vanilla',
    unknown: 'Неизвестно'
  },
  accents: {
    red: 'Красный',
    green: 'Зелёный',
    blue: 'Синий',
    violet: 'Фиолетовый',
    amber: 'Янтарный',
    slate: 'Серый'
  },
  configStatus: {
    owned: 'Активный мод',
    inactive: 'Отключённый мод',
    orphaned: 'Нет подходящего мода',
    system: 'Загрузчик / система',
    unmatched: 'Без привязки'
  },
  storageGroups: {
    mods: 'Моды',
    saves: 'Миры',
    resourcepacks: 'Ресурспаки',
    shaderpacks: 'Шейдерпаки',
    maps: 'Данные карт',
    backups: 'Резервные копии',
    cache: 'Кэш',
    logs: 'Логи и краши',
    other: 'Прочее'
  },
  units: {
    bytes: 'Б',
    kilobytes: 'КБ',
    megabytes: 'МБ',
    gigabytes: 'ГБ',
    terabytes: 'ТБ'
  },
  date: {
    never: 'Никогда',
    unknown: 'Неизвестно',
    today: 'Сегодня',
    yesterday: 'Вчера',
    daysAgo: (days) => `${days} ${slavicPlural(days, 'день', 'дня', 'дней')} назад`
  },
  nav: {
    overview: 'Обзор',
    searchInstances: 'Поиск сборок...',
    rescan: 'Пересканировать',
    addFolder: 'Добавить папку',
    pickFolderTitle: 'Выберите сборку или папку лаунчера со сборками',
    settings: 'Настройки',
    lightTheme: 'Переключить на светлую тему',
    darkTheme: 'Переключить на тёмную тему',
    noInstances: 'Сборки не найдены',
    noInstancesHint:
      'Портативные лаунчеры хранят данные вне обычных папок. Добавьте свою папку вручную, и она будет распознана так же.',
    lookingForInstances: 'Поиск сборок...',
    versionUnknown: 'Версия неизвестна'
  },
  home: {
    title: 'Обзор',
    subtitle: (instances, launchers) =>
      `${instances} ${slavicPlural(instances, 'сборка', 'сборки', 'сборок')} в ${launchers} ${slavicPlural(
        launchers,
        'лаунчере',
        'лаунчерах',
        'лаунчерах'
      )}.`,
    instances: 'Сборки',
    instancesHint: 'найдено на этом компьютере',
    launchers: 'Лаунчеры',
    launchersHint: 'с установленными сборками',
    versions: 'Версии Minecraft',
    versionsHint: 'различных среди сборок',
    totalOnDisk: 'Всего на диске',
    notMeasured: 'Не измерено',
    measureToFillIn: 'Измерьте, чтобы заполнить',
    files: (count) => `${count.toLocaleString('en-US')} файлов`,
    whereSpaceGoes: 'Куда уходит место',
    measureAll: 'Измерить все сборки',
    reMeasure: 'Измерить заново',
    measuring: 'Измерение сборок...',
    measureBlurb:
      'Обходит каждую сборку и показывает, какие из них действительно занимают место. На большой библиотеке занимает несколько секунд.',
    acrossAllInstances: 'по всем сборкам',
    smallerInstances: (count) =>
      `${count} ${slavicPlural(count, 'меньшая сборка', 'меньших сборки', 'меньших сборок')}`,
    byLauncher: 'По лаунчерам',
    instancesUnit: 'сборок',
    recentlyPlayed: 'Недавние запуски',
    noRecent: 'Ни один лаунчер не сохранил время последнего запуска для этих сборок.'
  },
  tabs: {
    overview: 'Обзор',
    mods: 'Моды',
    dependencies: 'Зависимости',
    configs: 'Конфиги',
    storage: 'Хранилище',
    resourcePacks: 'Ресурспаки',
    screenshots: 'Скриншоты'
  },
  common: {
    cancel: 'Отмена',
    save: 'Сохранить',
    saving: 'Сохранение...',
    close: 'Закрыть',
    open: 'Открыть',
    clearSelection: 'Снять выделение',
    showInFolder: 'Показать в папке',
    openFile: 'Открыть файл',
    editSettings: 'Изменить настройки',
    search: 'Поиск',
    nothingMatches: 'Ничего не найдено',
    tryDifferentSearch: 'Попробуйте другой запрос или фильтр.',
    selected: (count, size) => `Выбрано ${count}, ${size}`,
    moveToRecycleBin: 'В корзину',
    size: 'Размер',
    files: 'Файлы',
    fileCount: (count) => `${count} ${slavicPlural(count, 'файл', 'файла', 'файлов')}`,
    name: 'Название',
    status: 'Статус',
    version: 'Версия',
    loader: 'Загрузчик',
    enabled: 'Включён',
    disabled: 'Отключён',
    all: 'Все',
    unknown: 'Неизвестно',
    noneSet: 'Не заданы',
    launcherDefault: 'По умолчанию в лаунчере',
    server: 'Сервер',
    expand: (name) => `Развернуть ${name}`,
    collapse: (name) => `Свернуть ${name}`,
    showMore: (remaining) => `Показать ещё (осталось ${remaining})`
  },
  settings: {
    title: 'Настройки',
    theme: 'Тема',
    themeDetail: 'При выборе системной темы приложение следует настройке светлого и тёмного режима Windows.',
    followSystem: 'Как в системе',
    light: 'Светлая',
    dark: 'Тёмная',
    accent: 'Акцентный цвет',
    accentDetail:
      'Используется для кнопок, вкладок и ссылок. У графиков хранилища своя палитра, подобранная для различимости при нарушениях цветовосприятия, а не по вкусу.',
    language: 'Язык',
    languageDetail:
      'Изменения применяются сразу. Названия модов и ключи конфигов остаются такими, как их написал автор мода.',
    incompleteLanguage: 'неполный',
    extraFolders: 'Дополнительные папки для сканирования',
    extraFoldersDetail:
      'Проверяются при каждом сканировании вместе со стандартными папками лаунчеров. Папки, добавленные кнопкой «Добавить папку», сохраняются здесь.',
    noExtraFolders: 'Нет. Обычные папки лаунчеров сканируются всегда.',
    stopScanning: 'Больше не сканировать эту папку',
    deleting: 'Удаление файлов',
    deletingDetail:
      'Всё, что удаляет приложение, отправляется в корзину, а не удаляется навсегда. Сопоставление конфигов эвристическое, поэтому очистка должна быть обратимой. Это намеренно нельзя изменить.',
    recycleBinOnly: 'Только в корзину.'
  },
  overview: {
    activeMods: 'Активные моды',
    modsDisabled: (count) => `отключено: ${count}`,
    modsFolder: 'Папка модов',
    configEntries: 'Записи конфигов',
    configsMatchNoMod: (count) => `${count} без подходящего мода`,
    instanceSize: 'Размер сборки',
    openStorageTab: 'Откройте вкладку «Хранилище»',
    details: 'Подробности',
    launcher: 'Лаунчер',
    minecraft: 'Minecraft',
    modLoader: 'Загрузчик модов',
    memory: 'Память',
    memoryWithMinimum: (maximum, minimum) => `${maximum} (мин. ${minimum})`,
    javaArguments: 'Аргументы Java',
    lastPlayed: 'Последний запуск',
    instanceFolder: 'Папка сборки',
    gameFolder: 'Папка игры'
  },
  storage: {
    measureTitle: 'Измерить эту сборку',
    measureDetail:
      'Обходит все файлы и показывает, куда именно ушло место, как это делает WizTree. На больших сборках с крупными мирами занимает несколько секунд.',
    measureNow: 'Измерить',
    reMeasure: 'Измерить заново',
    measuringFiles: 'Измерение файлов...',
    filesMeasuredIn: (files, seconds) => `Измерено файлов: ${files}, за ${seconds} с`,
    share: 'Доля',
    truncatedNote:
      'Очень глубокие или очень широкие папки сгруппированы для отображения. Все показанные размеры точны.',
    openAsOwnView: 'Открыть отдельно',
    legendEntry: (group, size) => `${group} - ${size}`,
    moreItems: (count) => `Ещё ${count} элементов не показано. Откройте папку, чтобы увидеть все.`
  },
  configs: {
    matchedToMod: 'Сопоставлено с модом',
    configInUse: 'Конфиг используется',
    disabledMod: 'Отключённый мод',
    settingsKept: 'Настройки сохранены на будущее',
    noMatchingMod: 'Нет подходящего мода',
    reclaimable: (size) => `${size} можно освободить`,
    loaderAndSystem: 'Загрузчик и система',
    notOwned: 'Не принадлежит ни одному моду',
    quickSelect: 'Быстрый выбор',
    presetOrphaned: 'Нет подходящего мода',
    presetOrphanedHint: 'Конфиги, оставшиеся от модов, которые больше не установлены',
    presetInactive: 'От отключённых модов',
    presetInactiveHint:
      'Настройки модов, которые есть на диске, но выключены. Оставьте их, если планируете включить моды снова',
    presetUncertain: 'Неточные совпадения',
    presetUncertainHint: 'Привязано к моду, но с низкой уверенностью. Стоит проверить вручную',
    presetBackups: 'Резервные копии и .old',
    presetBackupsHint: 'Устаревшие копии, оставленные самими модами',
    presetWithCount: (label, count) => `${label} (${count})`,
    searchConfigs: 'Поиск конфигов...',
    filterActive: 'Активные',
    filterUnmatched: 'Без совпадений',
    filterSystem: 'Системные',
    selectAllShown: 'Выбрать все показанные конфиги',
    config: 'Конфиг',
    belongsTo: 'Принадлежит',
    confidence: 'Уверенность',
    sure: (percent) => `${percent}% уверенности`,
    noMatch: 'Нет совпадения',
    gameOptionsDetail: 'Настройки графики, звука и управления Minecraft для этой сборки',
    noConfigFolder: 'Нет папки config',
    noConfigFolderDetail:
      'Для этой сборки ещё ничего не записано в настройки, обычно это значит, что она ни разу не запускалась.',
    modsWithoutConfig: (count) =>
      `${count} ${slavicPlural(count, 'установленный мод', 'установленных мода', 'установленных модов')} без собственного конфига`,
    modsWithoutConfigDetail:
      'Это нормально. Многим модам настройки не нужны, а некоторые пишут их в папку другого мода.',
    purgeTitle: (count) => `Переместить ${count} записей конфигов в корзину?`,
    purgeDetail: (size) =>
      `Освободится ${size}. Ничего не удаляется навсегда, поэтому файлы можно восстановить из корзины, если мод всё же в них нуждался.`,
    purgeEntry: (path, owner) => (owner ? `${path}  (${owner})` : path),
    purgeOwnedWarning:
      'Часть из них принадлежит установленным и включённым модам. Их удаление сбросит настройки этих модов на стандартные.'
  },
  configEditor: {
    fallbackTitle: 'Конфиг',
    unsaved: (count) => `${count} несохранённых`,
    searchOptions: 'Поиск параметров...',
    nothingMatchesSearch: 'По этому запросу ничего не найдено.',
    openAsText: 'Открыть как текст',
    openInEditor: 'Открыть в редакторе по умолчанию',
    onePerLine: 'По одному в строке',
    saved: (count) =>
      `Сохранено ${count} ${slavicPlural(count, 'изменение', 'изменения', 'изменений')}.`,
    readFailed: 'Не удалось прочитать файл.',
    saveFailed: 'Не удалось сохранить файл.',
    unsupported: {
      fileType: 'Файлы этого типа здесь не редактируются.',
      unreadable: 'Не удалось прочитать файл.',
      tooLarge: 'Файл слишком велик для редактирования здесь.',
      notUnderstood: 'Файл не удалось разобрать достаточно надёжно для редактирования.',
      noOptions: 'В этом файле не найдено редактируемых параметров.',
      notSettings: 'Это не похоже на файл настроек.'
    },
    writeError: {
      fileType: 'Файлы этого типа нельзя редактировать.',
      unparsable: 'Не удалось разобрать файл.',
      stale:
        'Часть параметров не сохранена, потому что файл изменился на диске. Откройте его заново и повторите.',
      missingKeys: 'Части параметров больше нет в этом файле.',
      failed: 'Не удалось сохранить файл.'
    }
  },
  configReason: {
    system: 'Принадлежит загрузчику модов, а не моду',
    noMods: 'Не найдено модов для сравнения',
    noMatch: 'Ни один установленный мод не подходит по названию - вероятно, остался от удалённого мода',
    exactModId: (modId) => `Точно совпадает с id мода «${modId}»`,
    namedAfterModId: (modId) => `Назван по id мода «${modId}»`,
    normalisedModId: (modId) => `Совпадает с id мода «${modId}»`,
    bundledConfig: (modName) => `${modName} поставляет стандартный конфиг с таким именем`,
    modName: (modName) => `Совпадает с названием мода «${modName}»`,
    fileName: (modName) => `Совпадает с именем файла мода ${modName}`,
    initials: (candidate, modName) => `«${candidate}» - это инициалы мода ${modName}`,
    containsModId: (modId) => `Название содержит id мода «${modId}»`,
    shortenedModId: (modId) => `Сокращённая форма id мода «${modId}»`
  },
  mods: {
    searchMods: 'Поиск модов...',
    allWithCount: (count) => `Все ${count}`,
    unidentified: 'Неопознанные',
    mod: 'Мод',
    requires: 'Требует',
    worksWith: 'Работает с (необязательно)',
    incompatibleWith: 'Несовместим с',
    authors: 'Авторы',
    runsOn: 'Работает на',
    alsoProvides: 'Также предоставляет',
    file: 'Файл',
    clientOnly: 'Только клиент',
    serverOnly: 'Только сервер',
    clientAndServer: 'Клиент и сервер',
    noModsFolder: 'Нет папки mods',
    noModsFolderDetail: 'В этой сборке нет папки модов, поэтому смотреть пока нечего.',
    noManifest: (reason) =>
      `Нет читаемого манифеста (${reason}). Это нормально для библиотек и коремодов.`
  },
  dependencies: {
    withRequirements: 'Моды с зависимостями',
    ofInstalled: (count) => `из ${count} установленных`,
    unmet: 'Неудовлетворённые зависимости',
    unmetCount: (count) =>
      `${count} ${slavicPlural(count, 'неудовлетворённая зависимость', 'неудовлетворённые зависимости', 'неудовлетворённых зависимостей')}`,
    neededBy: (modId, presentButDisabled, requiredBy) =>
      `${modId}${presentButDisabled ? ' (есть, но отключён)' : ''} - нужен для ${requiredBy}`,
    nothingMissing: 'Ничего не пропущено',
    listedBelow: 'Перечислены ниже',
    conflicts: 'Заявленные конфликты',
    conflictSummary: (declaredBy, modId) => `${declaredBy} объявляет ${modId} несовместимым`,
    conflictSentence: (declaredBy, modId, versionRange, installedVersion) =>
      `${declaredBy} объявляет ${modId}${versionRange ? ` ${versionRange}` : ''} несовместимым${
        installedVersion ? `, а установлена версия ${installedVersion}` : ''
      }.`,
    noneDeclared: 'Не заявлено',
    excludeEachOther: 'Моды, исключающие друг друга',
    wholeInstance: 'Вся сборка',
    oneMod: 'Один мод',
    highlight: 'Подсветить',
    showDependenciesFor: 'Показать зависимости для',
    installed: 'Установлен',
    missing: 'Отсутствует',
    missingChip: (modId, presentButDisabled) =>
      `${modId}${presentButDisabled ? ' (отключён)' : ''}`,
    installedButDisabled: 'Установлен, но отключён',
    optional: 'Необязательный',
    includeOptionalLinks: 'Показывать необязательные связи',
    showAbsentOptional: (hidden) =>
      `Показывать неустановленные необязательные моды${hidden > 0 ? ` (скрыто ${hidden})` : ''}`,
    hoverHint:
      'Наведите на мод, чтобы проследить его зависимости. Перетаскивание - панорама, колесо - масштаб.',
    nothingRequiresThis: 'Ничего не требует этот мод',
    requiresNothing: 'Ничего больше не требует',
    unmetTitle: 'Неудовлетворённые зависимости',
    unmetHint: 'Нажмите, чтобы перейти к моду, который её запрашивает.',
    declaredConflicts: 'Заявленные конфликты',
    noMods: 'Нет модов',
    noModsDetail: 'Не из чего построить граф зависимостей.'
  },
  graph: {
    dependenciesOf: (name) => `Зависимости мода ${name}`,
    dependencyMapOf: (count) => `Карта зависимостей ${count} модов`,
    nothingToDraw: 'Нет модов для отрисовки.',
    notInModsFolder: 'Нет в папке модов',
    optionalDependency: 'необязательная зависимость',
    requiresThis: 'требует этот мод',
    missingList: (ids) => `Отсутствуют: ${ids}`,
    disabledDependencyList: (ids) => `Отключённые зависимости: ${ids}`,
    incompatibleList: (ids) => `Несовместим с: ${ids}`,
    modIsDisabled: 'Этот мод отключён',
    zoomIn: 'Приблизить',
    zoomOut: 'Отдалить',
    fitToView: 'Вписать в окно'
  },
  chart: {
    sizeBreakdownOf: (name) => `Распределение размера: ${name}`,
    shareOfFolder: (size, percent) => `${size} - ${percent} этой папки`,
    clickToOpen: 'нажмите, чтобы открыть'
  },
  packs: {
    installed: 'Установлено',
    packsOnDisk: 'паков на диске',
    active: 'Активные',
    loaded: (size) => `${size} загружено`,
    notInUse: 'Не используются',
    idle: (size) => `${size} простаивает`,
    totalSize: 'Общий размер',
    wholeFolder: 'вся папка',
    selectInactive: (count) => `Выбрать неактивные (${count})`,
    activeAt: (position) => `Активен №${position}`,
    turnOnInGame: 'Включить в игре',
    turnOffInGame: 'Выключить в игре',
    enablePack: (name) => `Включить ${name}`,
    folder: 'Папка',
    noFolder: 'Нет папки resourcepacks',
    noFolderDetail: 'В этой сборке пока нет папки ресурспаков.',
    noneInstalled: 'Ресурспаки не установлены',
    noneInstalledDetail:
      'Паки, добавленные в сборку, появятся здесь с размером и порядком загрузки.',
    purgeTitle: (count) => `Переместить ${count} ресурспаков в корзину?`,
    purgeDetail: (size) => `Освободится ${size}. Ничего не удаляется навсегда.`,
    purgeEntry: (name, active) => `${name}${active ? '  (сейчас активен)' : ''}`,
    activeWarning:
      'Часть из них сейчас активна в игре. Их удаление изменит внешний вид сборки.'
  },
  screenshots: {
    count: 'Скриншоты',
    inThisInstance: 'в этой сборке',
    totalSize: 'Общий размер',
    wholeFolder: 'вся папка',
    olderThanSixMonths: 'Старше 6 месяцев',
    selectOld: (count) => `Выбрать старше 6 месяцев (${count})`,
    selectLarge: (count) => `Выбрать больше 4 МБ (${count})`,
    selectOne: (name) => `Выбрать ${name}`,
    newest: 'Новые',
    oldest: 'Старые',
    largest: 'Крупные',
    none: 'Нет скриншотов',
    noneDetail:
      'Скриншоты, сделанные в этой сборке, появятся здесь с размерами и массовой очисткой.',
    openFullSize: 'Открыть в полном размере',
    purgeTitle: (count) => `Переместить ${count} скриншотов в корзину?`,
    purgeDetail: (size) =>
      `Освободится ${size}. Ничего не удаляется навсегда, файлы можно восстановить из корзины.`
  },
  insights: {
    heading: 'Состояние и производительность',
    critical: 'Критично',
    serious: 'Требует внимания',
    warning: 'Стоит проверить',
    good: 'Всё хорошо',
    info: 'Заметка',
    conflictsTitle: (count) =>
      `Вместе установлены ${count} ${slavicPlural(count, 'несовместимый мод', 'несовместимых мода', 'несовместимых модов')}`,
    missingDependenciesTitle: (count) =>
      `Не хватает ${count} ${slavicPlural(count, 'обязательной зависимости', 'обязательных зависимостей', 'обязательных зависимостей')}`,
    missingDependenciesDetail: (ids, extra) =>
      `Игра почти наверняка не запустится. Отсутствуют: ${ids}${extra > 0 ? `, и ещё ${extra}` : ''}.`,
    disabledDependenciesTitle: (count) =>
      `${count} ${slavicPlural(count, 'обязательная зависимость отключена', 'обязательные зависимости отключены', 'обязательных зависимостей отключено')}`,
    disabledDependenciesDetail: (ids) =>
      `Есть в папке модов, но выключены: ${ids}. Включите их или удалите то, что от них зависит.`,
    memoryDefaultTitle: 'Память оставлена по умолчанию в лаунчере',
    memoryDefaultManyMods: (count) =>
      `При ${count} установленных модах стоит задать объём явно - стандартного обычно заметно не хватает такой сборке.`,
    memoryDefaultDetail:
      'Задайте объём памяти в лаунчере, если сталкиваетесь с подтормаживаниями или вылетами из-за нехватки памяти.',
    memoryLowTitle: (memory, count) => `${memory} скорее всего мало для ${count} модов`,
    memoryLowDetail:
      'Ожидайте частые подтормаживания из-за сборки мусора и возможные вылеты из-за нехватки памяти. 6 ГБ - разумная отправная точка для сборки такого размера.',
    memoryHighTitle: (memory) => `${memory} больше, чем нужно этой сборке`,
    memoryHighDetail:
      'Избыток памяти не ускоряет Minecraft - он удлиняет каждую паузу сборки мусора, что ощущается как периодические подвисания. 6-8 ГБ подходят почти любой сборке.',
    noPerformanceModsTitle: 'Моды на производительность не найдены',
    noPerformanceModsDetail:
      'Замена рендерера (Sodium на Fabric, Embeddium на Forge/NeoForge) вместе с FerriteCore и ModernFix обычно даёт самый заметный прирост по времени кадра и расходу памяти.',
    performanceModsTitle: (count) =>
      `${count} ${slavicPlural(count, 'мод на производительность активен', 'мода на производительность активны', 'модов на производительность активны')}`,
    obsoleteGcTitle: 'В аргументах Java указан сборщик мусора, которого больше нет',
    obsoleteGcDetail: (flags) =>
      `${flags} удалён из JVM. Современный Minecraft поставляется с версией Java, которая с этими флагами не запустится. Уберите их и оставьте G1.`,
    orphanedConfigsTitle: (count) =>
      `${count} ${slavicPlural(count, 'запись конфига не соответствует', 'записи конфигов не соответствуют', 'записей конфигов не соответствуют')} ни одному установленному моду`,
    orphanedConfigsDetail: (size) =>
      `Осталось после удаления модов, занимает ${size}. Помимо места на диске, оставшиеся конфиги всё равно читаются при запуске и могут замедлять старт и вызывать подвисания. На вкладке «Конфиги» их можно выбрать и удалить пачкой; сначала проверьте всё с низкой уверенностью, поскольку некоторые моды называют конфиг иначе, чем свой id.`,
    inactiveConfigsTitle: (count) =>
      `${count} ${slavicPlural(count, 'запись конфига принадлежит', 'записи конфигов принадлежат', 'записей конфигов принадлежат')} отключённому моду`,
    inactiveConfigsDetail:
      'Сохраните их, если планируете включить мод снова - ваши настройки внутри.',
    disabledModsTitle: (count) =>
      `${count} ${slavicPlural(count, 'отключённый мод остаётся', 'отключённых мода остаются', 'отключённых модов остаются')} на диске`,
    disabledModsDetail: (size) => `На производительность они не влияют, но занимают ${size}.`,
    unidentifiedModsTitle: (count) =>
      `${count} ${slavicPlural(count, 'jar не содержит', 'jar не содержат', 'jar не содержат')} читаемых метаданных мода`,
    unidentifiedModsDetail:
      'Это нормально для библиотек и коремодов, которые загружаются по имени, а не по манифесту. Они перечислены на вкладке «Моды», чтобы можно было убедиться, что там нет ничего лишнего.',
    disposableStorageTitle: (size) => `${size} логов, отчётов о сбоях и кэша`,
    disposableStorageDetail:
      'Всё это игра создаёт заново. Очистка этого - самое безопасное освобождение места.'
  },
  progress: {
    checkingLauncher: (launcher) => `Проверка: ${launcher}`,
    measuringInstance: (name, current, total) => `${name} (${current} из ${total})`,
    walkingFiles: (path, files) => `${path} (файлов: ${files})`
  },
  loading: {
    mods: 'Чтение манифестов модов...',
    dependencies: 'Разбор зависимостей...',
    configs: 'Сопоставление конфигов с модами...',
    packs: 'Чтение ресурспаков...',
    screenshots: 'Составление списка скриншотов...'
  },
  notices: {
    instancesAdded: (count) =>
      `Добавлено ${count} ${slavicPlural(count, 'сборка', 'сборки', 'сборок')}.`,
    movedToBin: (count) =>
      `В корзину перемещено ${count} ${slavicPlural(count, 'элемент', 'элемента', 'элементов')}.`,
    movedPartly: (moved, failed, detail) =>
      `Перемещено ${moved}, не удалось переместить ${failed}.${detail ? ` ${detail}` : ''}`,
    scanFailed: 'Не удалось завершить сканирование.',
    folderFailed: 'Не удалось прочитать эту папку.',
    measureAllFailed: 'Не удалось измерить сборки.',
    measureFailed: 'Не удалось измерить эту сборку.',
    purgeFailed: 'Не удалось переместить эти файлы.',
    modToggleFailed: 'Не удалось изменить этот мод.',
    packToggleFailed: 'Не удалось изменить этот ресурспак.',
    modFileExists: (name) => `${name} уже есть в папке модов.`,
    noOptionsFile:
      'В этой сборке ещё нет options.txt. Запустите игру один раз и попробуйте снова.',
    analysisFailed: (detail) => `Не удалось прочитать эту сборку: ${detail}`
  }
}

const uk: Messages = {
  appName: 'Modpack Utility',
  launchers: {
    prism: 'Prism Launcher',
    multimc: 'MultiMC',
    curseforge: 'CurseForge',
    modrinth: 'Modrinth',
    atlauncher: 'ATLauncher',
    gdlauncher: 'GDLauncher',
    ftb: 'FTB App',
    technic: 'Technic',
    vanilla: 'Офіційний лаунчер',
    server: 'Виділений сервер',
    custom: 'Нерозпізнаний'
  },
  loaders: {
    neoforge: 'NeoForge',
    forge: 'Forge',
    'legacy-forge': 'Forge (застарілий)',
    fabric: 'Fabric',
    quilt: 'Quilt',
    vanilla: 'Vanilla',
    unknown: 'Невідомо'
  },
  accents: {
    red: 'Червоний',
    green: 'Зелений',
    blue: 'Синій',
    violet: 'Фіолетовий',
    amber: 'Бурштиновий',
    slate: 'Сірий'
  },
  configStatus: {
    owned: 'Активний мод',
    inactive: 'Вимкнений мод',
    orphaned: 'Немає відповідного мода',
    system: 'Завантажувач / система',
    unmatched: 'Без прив\'язки'
  },
  storageGroups: {
    mods: 'Моди',
    saves: 'Світи',
    resourcepacks: 'Ресурспаки',
    shaderpacks: 'Шейдерпаки',
    maps: 'Дані карт',
    backups: 'Резервні копії',
    cache: 'Кеш',
    logs: 'Логи та збої',
    other: 'Інше'
  },
  units: {
    bytes: 'Б',
    kilobytes: 'КБ',
    megabytes: 'МБ',
    gigabytes: 'ГБ',
    terabytes: 'ТБ'
  },
  date: {
    never: 'Ніколи',
    unknown: 'Невідомо',
    today: 'Сьогодні',
    yesterday: 'Учора',
    daysAgo: (days) => `${days} ${slavicPlural(days, 'день', 'дні', 'днів')} тому`
  },
  nav: {
    overview: 'Огляд',
    searchInstances: 'Пошук збірок...',
    rescan: 'Пересканувати',
    addFolder: 'Додати теку',
    pickFolderTitle: 'Виберіть збірку або теку лаунчера зі збірками',
    settings: 'Налаштування',
    lightTheme: 'Перемкнути на світлу тему',
    darkTheme: 'Перемкнути на темну тему',
    noInstances: 'Збірок не знайдено',
    noInstancesHint:
      'Портативні лаунчери зберігають дані поза звичайними теками. Додайте свою теку вручну, і її буде розпізнано так само.',
    lookingForInstances: 'Пошук збірок...',
    versionUnknown: 'Версія невідома'
  },
  home: {
    title: 'Огляд',
    subtitle: (instances, launchers) =>
      `${instances} ${slavicPlural(instances, 'збірка', 'збірки', 'збірок')} у ${launchers} ${slavicPlural(
        launchers,
        'лаунчері',
        'лаунчерах',
        'лаунчерах'
      )}.`,
    instances: 'Збірки',
    instancesHint: 'знайдено на цьому комп\'ютері',
    launchers: 'Лаунчери',
    launchersHint: 'зі встановленими збірками',
    versions: 'Версії Minecraft',
    versionsHint: 'різних серед збірок',
    totalOnDisk: 'Усього на диску',
    notMeasured: 'Не виміряно',
    measureToFillIn: 'Виміряйте, щоб заповнити',
    files: (count) => `${count.toLocaleString('en-US')} файлів`,
    whereSpaceGoes: 'Куди зникає місце',
    measureAll: 'Виміряти всі збірки',
    reMeasure: 'Виміряти знову',
    measuring: 'Вимірювання збірок...',
    measureBlurb:
      'Обходить кожну збірку та показує, які з них справді займають місце. На великій бібліотеці триває кілька секунд.',
    acrossAllInstances: 'по всіх збірках',
    smallerInstances: (count) =>
      `${count} ${slavicPlural(count, 'менша збірка', 'менші збірки', 'менших збірок')}`,
    byLauncher: 'За лаунчерами',
    instancesUnit: 'збірок',
    recentlyPlayed: 'Нещодавні запуски',
    noRecent: 'Жоден лаунчер не зберіг час останнього запуску для цих збірок.'
  },
  tabs: {
    overview: 'Огляд',
    mods: 'Моди',
    dependencies: 'Залежності',
    configs: 'Конфіги',
    storage: 'Сховище',
    resourcePacks: 'Ресурспаки',
    screenshots: 'Знімки екрана'
  },
  common: {
    cancel: 'Скасувати',
    save: 'Зберегти',
    saving: 'Збереження...',
    close: 'Закрити',
    open: 'Відкрити',
    clearSelection: 'Зняти виділення',
    showInFolder: 'Показати в теці',
    openFile: 'Відкрити файл',
    editSettings: 'Змінити налаштування',
    search: 'Пошук',
    nothingMatches: 'Нічого не знайдено',
    tryDifferentSearch: 'Спробуйте інший запит або фільтр.',
    selected: (count, size) => `Вибрано ${count}, ${size}`,
    moveToRecycleBin: 'До кошика',
    size: 'Розмір',
    files: 'Файли',
    fileCount: (count) => `${count} ${slavicPlural(count, 'файл', 'файли', 'файлів')}`,
    name: 'Назва',
    status: 'Стан',
    version: 'Версія',
    loader: 'Завантажувач',
    enabled: 'Увімкнено',
    disabled: 'Вимкнено',
    all: 'Усі',
    unknown: 'Невідомо',
    noneSet: 'Не задано',
    launcherDefault: 'За замовчуванням у лаунчері',
    server: 'Сервер',
    expand: (name) => `Розгорнути ${name}`,
    collapse: (name) => `Згорнути ${name}`,
    showMore: (remaining) => `Показати ще (лишилось ${remaining})`
  },
  settings: {
    title: 'Налаштування',
    theme: 'Тема',
    themeDetail: 'Системна тема слідує за світлим і темним режимом Windows.',
    followSystem: 'Як у системі',
    light: 'Світла',
    dark: 'Темна',
    accent: 'Акцентний колір',
    accentDetail:
      'Використовується для кнопок, вкладок і посилань. Графіки сховища мають власну палітру, підібрану для розрізнення при порушеннях кольоросприйняття, а не за смаком.',
    language: 'Мова',
    languageDetail:
      'Зміни застосовуються одразу. Назви модів і ключі конфігів залишаються такими, як їх написав автор мода.',
    incompleteLanguage: 'неповна',
    extraFolders: 'Додаткові теки для сканування',
    extraFoldersDetail:
      'Перевіряються під час кожного сканування разом зі стандартними теками лаунчерів. Теки, додані кнопкою «Додати теку», зберігаються тут.',
    noExtraFolders: 'Немає. Звичайні теки лаунчерів скануються завжди.',
    stopScanning: 'Більше не сканувати цю теку',
    deleting: 'Видалення файлів',
    deletingDetail:
      'Усе, що видаляє застосунок, потрапляє до кошика, а не видаляється назавжди. Зіставлення конфігів евристичне, тому очищення має бути оборотним. Це навмисно не можна змінити.',
    recycleBinOnly: 'Лише до кошика.'
  },
  overview: {
    activeMods: 'Активні моди',
    modsDisabled: (count) => `вимкнено: ${count}`,
    modsFolder: 'Тека модів',
    configEntries: 'Записи конфігів',
    configsMatchNoMod: (count) => `${count} без відповідного мода`,
    instanceSize: 'Розмір збірки',
    openStorageTab: 'Відкрийте вкладку «Сховище»',
    details: 'Подробиці',
    launcher: 'Лаунчер',
    minecraft: 'Minecraft',
    modLoader: 'Завантажувач модів',
    memory: 'Пам\'ять',
    memoryWithMinimum: (maximum, minimum) => `${maximum} (мін. ${minimum})`,
    javaArguments: 'Аргументи Java',
    lastPlayed: 'Останній запуск',
    instanceFolder: 'Тека збірки',
    gameFolder: 'Тека гри'
  },
  storage: {
    measureTitle: 'Виміряти цю збірку',
    measureDetail:
      'Обходить усі файли та показує, куди саме пішло місце, як це робить WizTree. На великих збірках із великими світами триває кілька секунд.',
    measureNow: 'Виміряти',
    reMeasure: 'Виміряти знову',
    measuringFiles: 'Вимірювання файлів...',
    filesMeasuredIn: (files, seconds) => `Виміряно файлів: ${files}, за ${seconds} с`,
    share: 'Частка',
    truncatedNote:
      'Дуже глибокі або дуже широкі теки згруповано для показу. Усі показані розміри точні.',
    openAsOwnView: 'Відкрити окремо',
    legendEntry: (group, size) => `${group} - ${size}`,
    moreItems: (count) => `Ще ${count} елементів не показано. Відкрийте теку, щоб побачити всі.`
  },
  configs: {
    matchedToMod: 'Зіставлено з модом',
    configInUse: 'Конфіг використовується',
    disabledMod: 'Вимкнений мод',
    settingsKept: 'Налаштування збережено на потім',
    noMatchingMod: 'Немає відповідного мода',
    reclaimable: (size) => `${size} можна звільнити`,
    loaderAndSystem: 'Завантажувач і система',
    notOwned: 'Не належить жодному моду',
    quickSelect: 'Швидкий вибір',
    presetOrphaned: 'Немає відповідного мода',
    presetOrphanedHint: 'Конфіги, що лишилися від модів, які більше не встановлені',
    presetInactive: 'Від вимкнених модів',
    presetInactiveHint:
      'Налаштування модів, які є на диску, але вимкнені. Залиште їх, якщо плануєте увімкнути моди знову',
    presetUncertain: 'Неточні збіги',
    presetUncertainHint: 'Прив\'язано до мода, але з низькою впевненістю. Варто перевірити вручну',
    presetBackups: 'Резервні копії та .old',
    presetBackupsHint: 'Застарілі копії, залишені самими модами',
    presetWithCount: (label, count) => `${label} (${count})`,
    searchConfigs: 'Пошук конфігів...',
    filterActive: 'Активні',
    filterUnmatched: 'Без збігів',
    filterSystem: 'Системні',
    selectAllShown: 'Вибрати всі показані конфіги',
    config: 'Конфіг',
    belongsTo: 'Належить',
    confidence: 'Впевненість',
    sure: (percent) => `${percent}% впевненості`,
    noMatch: 'Немає збігу',
    gameOptionsDetail: 'Налаштування графіки, звуку та керування Minecraft для цієї збірки',
    noConfigFolder: 'Немає теки config',
    noConfigFolderDetail:
      'Для цієї збірки ще нічого не записано в налаштування, зазвичай це означає, що її жодного разу не запускали.',
    modsWithoutConfig: (count) =>
      `${count} ${slavicPlural(count, 'встановлений мод', 'встановлені моди', 'встановлених модів')} без власного конфіга`,
    modsWithoutConfigDetail:
      'Це нормально. Багатьом модам налаштування не потрібні, а деякі пишуть їх у теку іншого мода.',
    purgeTitle: (count) => `Перемістити ${count} записів конфігів до кошика?`,
    purgeDetail: (size) =>
      `Звільниться ${size}. Нічого не видаляється назавжди, тож файли можна відновити з кошика, якщо мод усе ж їх потребував.`,
    purgeEntry: (path, owner) => (owner ? `${path}  (${owner})` : path),
    purgeOwnedWarning:
      'Частина з них належить встановленим і увімкненим модам. Їх видалення скине налаштування цих модів на стандартні.'
  },
  configEditor: {
    fallbackTitle: 'Конфіг',
    unsaved: (count) => `${count} незбережених`,
    searchOptions: 'Пошук параметрів...',
    nothingMatchesSearch: 'За цим запитом нічого не знайдено.',
    openAsText: 'Відкрити як текст',
    openInEditor: 'Відкрити в типовому редакторі',
    onePerLine: 'По одному в рядку',
    saved: (count) => `Збережено ${count} ${slavicPlural(count, 'зміну', 'зміни', 'змін')}.`,
    readFailed: 'Не вдалося прочитати файл.',
    saveFailed: 'Не вдалося зберегти файл.',
    unsupported: {
      fileType: 'Файли цього типу тут не редагуються.',
      unreadable: 'Не вдалося прочитати файл.',
      tooLarge: 'Файл завеликий для редагування тут.',
      notUnderstood: 'Файл не вдалося розібрати достатньо надійно для редагування.',
      noOptions: 'У цьому файлі не знайдено редагованих параметрів.',
      notSettings: 'Це не схоже на файл налаштувань.'
    },
    writeError: {
      fileType: 'Файли цього типу не можна редагувати.',
      unparsable: 'Не вдалося розібрати файл.',
      stale:
        'Частину параметрів не збережено, бо файл змінився на диску. Відкрийте його заново та повторіть.',
      missingKeys: 'Частини параметрів більше немає в цьому файлі.',
      failed: 'Не вдалося зберегти файл.'
    }
  },
  configReason: {
    system: 'Належить завантажувачу модів, а не моду',
    noMods: 'Не знайдено модів для порівняння',
    noMatch:
      'Жоден встановлений мод не підходить за назвою - імовірно, лишився від видаленого мода',
    exactModId: (modId) => `Точно збігається з id мода «${modId}»`,
    namedAfterModId: (modId) => `Названо за id мода «${modId}»`,
    normalisedModId: (modId) => `Збігається з id мода «${modId}»`,
    bundledConfig: (modName) => `${modName} постачає стандартний конфіг із такою назвою`,
    modName: (modName) => `Збігається з назвою мода «${modName}»`,
    fileName: (modName) => `Збігається з іменем файлу мода ${modName}`,
    initials: (candidate, modName) => `«${candidate}» - це ініціали мода ${modName}`,
    containsModId: (modId) => `Назва містить id мода «${modId}»`,
    shortenedModId: (modId) => `Скорочена форма id мода «${modId}»`
  },
  mods: {
    searchMods: 'Пошук модів...',
    allWithCount: (count) => `Усі ${count}`,
    unidentified: 'Невпізнані',
    mod: 'Мод',
    requires: 'Потребує',
    worksWith: 'Працює з (необов\'язково)',
    incompatibleWith: 'Несумісний з',
    authors: 'Автори',
    runsOn: 'Працює на',
    alsoProvides: 'Також надає',
    file: 'Файл',
    clientOnly: 'Лише клієнт',
    serverOnly: 'Лише сервер',
    clientAndServer: 'Клієнт і сервер',
    noModsFolder: 'Немає теки mods',
    noModsFolderDetail: 'У цій збірці немає теки модів, тому поки що немає на що дивитися.',
    noManifest: (reason) =>
      `Немає читабельного маніфесту (${reason}). Це нормально для бібліотек і коремодів.`
  },
  dependencies: {
    withRequirements: 'Моди із залежностями',
    ofInstalled: (count) => `з ${count} встановлених`,
    unmet: 'Незадоволені залежності',
    unmetCount: (count) =>
      `${count} ${slavicPlural(count, 'незадоволена залежність', 'незадоволені залежності', 'незадоволених залежностей')}`,
    neededBy: (modId, presentButDisabled, requiredBy) =>
      `${modId}${presentButDisabled ? ' (є, але вимкнений)' : ''} - потрібен для ${requiredBy}`,
    nothingMissing: 'Нічого не бракує',
    listedBelow: 'Перелічено нижче',
    conflicts: 'Заявлені конфлікти',
    conflictSummary: (declaredBy, modId) => `${declaredBy} оголошує ${modId} несумісним`,
    conflictSentence: (declaredBy, modId, versionRange, installedVersion) =>
      `${declaredBy} оголошує ${modId}${versionRange ? ` ${versionRange}` : ''} несумісним${
        installedVersion ? `, а встановлено версію ${installedVersion}` : ''
      }.`,
    noneDeclared: 'Не заявлено',
    excludeEachOther: 'Моди, що виключають один одного',
    wholeInstance: 'Уся збірка',
    oneMod: 'Один мод',
    highlight: 'Підсвітити',
    showDependenciesFor: 'Показати залежності для',
    installed: 'Встановлено',
    missing: 'Відсутній',
    missingChip: (modId, presentButDisabled) =>
      `${modId}${presentButDisabled ? ' (вимкнений)' : ''}`,
    installedButDisabled: 'Встановлено, але вимкнено',
    optional: 'Необов\'язковий',
    includeOptionalLinks: 'Показувати необов\'язкові зв\'язки',
    showAbsentOptional: (hidden) =>
      `Показувати невстановлені необов\'язкові моди${hidden > 0 ? ` (приховано ${hidden})` : ''}`,
    hoverHint:
      'Наведіть на мод, щоб простежити його залежності. Перетягування - панорама, коліщатко - масштаб.',
    nothingRequiresThis: 'Ніщо не потребує цей мод',
    requiresNothing: 'Більше нічого не потребує',
    unmetTitle: 'Незадоволені залежності',
    unmetHint: 'Натисніть, щоб перейти до мода, який її запитує.',
    declaredConflicts: 'Заявлені конфлікти',
    noMods: 'Немає модів',
    noModsDetail: 'Немає з чого побудувати граф залежностей.'
  },
  graph: {
    dependenciesOf: (name) => `Залежності мода ${name}`,
    dependencyMapOf: (count) => `Карта залежностей ${count} модів`,
    nothingToDraw: 'Немає модів для відображення.',
    notInModsFolder: 'Немає в теці модів',
    optionalDependency: 'необов\'язкова залежність',
    requiresThis: 'потребує цей мод',
    missingList: (ids) => `Відсутні: ${ids}`,
    disabledDependencyList: (ids) => `Вимкнені залежності: ${ids}`,
    incompatibleList: (ids) => `Несумісний з: ${ids}`,
    modIsDisabled: 'Цей мод вимкнено',
    zoomIn: 'Наблизити',
    zoomOut: 'Віддалити',
    fitToView: 'Вписати у вікно'
  },
  chart: {
    sizeBreakdownOf: (name) => `Розподіл розміру: ${name}`,
    shareOfFolder: (size, percent) => `${size} - ${percent} цієї теки`,
    clickToOpen: 'натисніть, щоб відкрити'
  },
  packs: {
    installed: 'Встановлено',
    packsOnDisk: 'паків на диску',
    active: 'Активні',
    loaded: (size) => `${size} завантажено`,
    notInUse: 'Не використовуються',
    idle: (size) => `${size} простоює`,
    totalSize: 'Загальний розмір',
    wholeFolder: 'уся тека',
    selectInactive: (count) => `Вибрати неактивні (${count})`,
    activeAt: (position) => `Активний №${position}`,
    turnOnInGame: 'Увімкнути у грі',
    turnOffInGame: 'Вимкнути у грі',
    enablePack: (name) => `Увімкнути ${name}`,
    folder: 'Тека',
    noFolder: 'Немає теки resourcepacks',
    noFolderDetail: 'У цій збірці поки немає теки ресурспаків.',
    noneInstalled: 'Ресурспаки не встановлено',
    noneInstalledDetail:
      'Паки, додані до збірки, з\'являться тут із розміром і порядком завантаження.',
    purgeTitle: (count) => `Перемістити ${count} ресурспаків до кошика?`,
    purgeDetail: (size) => `Звільниться ${size}. Нічого не видаляється назавжди.`,
    purgeEntry: (name, active) => `${name}${active ? '  (зараз активний)' : ''}`,
    activeWarning:
      'Частина з них зараз активна у грі. Їх видалення змінить вигляд збірки.'
  },
  screenshots: {
    count: 'Знімки екрана',
    inThisInstance: 'у цій збірці',
    totalSize: 'Загальний розмір',
    wholeFolder: 'уся тека',
    olderThanSixMonths: 'Старші за 6 місяців',
    selectOld: (count) => `Вибрати старші за 6 місяців (${count})`,
    selectLarge: (count) => `Вибрати більші за 4 МБ (${count})`,
    selectOne: (name) => `Вибрати ${name}`,
    newest: 'Нові',
    oldest: 'Старі',
    largest: 'Великі',
    none: 'Немає знімків',
    noneDetail:
      'Знімки, зроблені в цій збірці, з\'являться тут із розмірами та масовим очищенням.',
    openFullSize: 'Відкрити в повному розмірі',
    purgeTitle: (count) => `Перемістити ${count} знімків до кошика?`,
    purgeDetail: (size) =>
      `Звільниться ${size}. Нічого не видаляється назавжди, файли можна відновити з кошика.`
  },
  insights: {
    heading: 'Стан і продуктивність',
    critical: 'Критично',
    serious: 'Потребує уваги',
    warning: 'Варто перевірити',
    good: 'Усе добре',
    info: 'Примітка',
    conflictsTitle: (count) =>
      `Разом встановлено ${count} ${slavicPlural(count, 'несумісний мод', 'несумісні моди', 'несумісних модів')}`,
    missingDependenciesTitle: (count) =>
      `Бракує ${count} ${slavicPlural(count, 'обов\'язкової залежності', 'обов\'язкових залежностей', 'обов\'язкових залежностей')}`,
    missingDependenciesDetail: (ids, extra) =>
      `Гра майже напевно не запуститься. Відсутні: ${ids}${extra > 0 ? `, і ще ${extra}` : ''}.`,
    disabledDependenciesTitle: (count) =>
      `${count} ${slavicPlural(count, 'обов\'язкову залежність вимкнено', 'обов\'язкові залежності вимкнено', 'обов\'язкових залежностей вимкнено')}`,
    disabledDependenciesDetail: (ids) =>
      `Є в теці модів, але вимкнені: ${ids}. Увімкніть їх або приберіть те, що від них залежить.`,
    memoryDefaultTitle: 'Пам\'ять залишено за замовчуванням у лаунчері',
    memoryDefaultManyMods: (count) =>
      `За ${count} встановлених модів варто задати обсяг явно - стандартного зазвичай помітно бракує такій збірці.`,
    memoryDefaultDetail:
      'Задайте обсяг пам\'яті у лаунчері, якщо стикаєтеся з підгальмовуваннями або вильотами через брак пам\'яті.',
    memoryLowTitle: (memory, count) => `${memory} найімовірніше замало для ${count} модів`,
    memoryLowDetail:
      'Очікуйте часті підгальмовування через збирання сміття та можливі вильоти через брак пам\'яті. 6 ГБ - розумна відправна точка для збірки такого розміру.',
    memoryHighTitle: (memory) => `${memory} більше, ніж потрібно цій збірці`,
    memoryHighDetail:
      'Надлишок пам\'яті не пришвидшує Minecraft - він подовжує кожну паузу збирання сміття, що відчувається як періодичні підвисання. 6-8 ГБ підходять майже будь-якій збірці.',
    noPerformanceModsTitle: 'Моди на продуктивність не знайдено',
    noPerformanceModsDetail:
      'Заміна рендерера (Sodium на Fabric, Embeddium на Forge/NeoForge) разом із FerriteCore і ModernFix зазвичай дає найпомітніший приріст за часом кадру та витратами пам\'яті.',
    performanceModsTitle: (count) =>
      `${count} ${slavicPlural(count, 'мод на продуктивність активний', 'моди на продуктивність активні', 'модів на продуктивність активні')}`,
    obsoleteGcTitle: 'В аргументах Java вказано збирач сміття, якого більше немає',
    obsoleteGcDetail: (flags) =>
      `${flags} вилучено з JVM. Сучасний Minecraft постачається з версією Java, яка з цими прапорцями не запуститься. Приберіть їх і залиште G1.`,
    orphanedConfigsTitle: (count) =>
      `${count} ${slavicPlural(count, 'запис конфіга не відповідає', 'записи конфігів не відповідають', 'записів конфігів не відповідають')} жодному встановленому моду`,
    orphanedConfigsDetail: (size) =>
      `Лишилося після видалення модів, займає ${size}. Окрім місця на диску, залишені конфіги все одно читаються під час запуску та можуть уповільнювати старт і спричиняти підвисання. На вкладці «Конфіги» їх можна вибрати та видалити гуртом; спершу перевірте все з низькою впевненістю, оскільки деякі моди називають конфіг інакше, ніж свій id.`,
    inactiveConfigsTitle: (count) =>
      `${count} ${slavicPlural(count, 'запис конфіга належить', 'записи конфігів належать', 'записів конфігів належать')} вимкненому моду`,
    inactiveConfigsDetail:
      'Збережіть їх, якщо плануєте увімкнути мод знову - ваші налаштування всередині.',
    disabledModsTitle: (count) =>
      `${count} ${slavicPlural(count, 'вимкнений мод лишається', 'вимкнені моди лишаються', 'вимкнених модів лишаються')} на диску`,
    disabledModsDetail: (size) => `На продуктивність вони не впливають, але займають ${size}.`,
    unidentifiedModsTitle: (count) =>
      `${count} ${slavicPlural(count, 'jar не містить', 'jar не містять', 'jar не містять')} читабельних метаданих мода`,
    unidentifiedModsDetail:
      'Це нормально для бібліотек і коремодів, які завантажуються за іменем, а не за маніфестом. Вони перелічені на вкладці «Моди», щоб можна було переконатися, що там немає нічого зайвого.',
    disposableStorageTitle: (size) => `${size} логів, звітів про збої та кешу`,
    disposableStorageDetail:
      'Усе це гра створює заново. Очищення цього - найбезпечніше звільнення місця.'
  },
  progress: {
    checkingLauncher: (launcher) => `Перевірка: ${launcher}`,
    measuringInstance: (name, current, total) => `${name} (${current} з ${total})`,
    walkingFiles: (path, files) => `${path} (файлів: ${files})`
  },
  loading: {
    mods: 'Читання маніфестів модів...',
    dependencies: 'Розбір залежностей...',
    configs: 'Зіставлення конфігів із модами...',
    packs: 'Читання ресурспаків...',
    screenshots: 'Складання списку знімків...'
  },
  notices: {
    instancesAdded: (count) =>
      `Додано ${count} ${slavicPlural(count, 'збірку', 'збірки', 'збірок')}.`,
    movedToBin: (count) =>
      `До кошика переміщено ${count} ${slavicPlural(count, 'елемент', 'елементи', 'елементів')}.`,
    movedPartly: (moved, failed, detail) =>
      `Переміщено ${moved}, не вдалося перемістити ${failed}.${detail ? ` ${detail}` : ''}`,
    scanFailed: 'Не вдалося завершити сканування.',
    folderFailed: 'Не вдалося прочитати цю теку.',
    measureAllFailed: 'Не вдалося виміряти збірки.',
    measureFailed: 'Не вдалося виміряти цю збірку.',
    purgeFailed: 'Не вдалося перемістити ці файли.',
    modToggleFailed: 'Не вдалося змінити цей мод.',
    packToggleFailed: 'Не вдалося змінити цей ресурспак.',
    modFileExists: (name) => `${name} вже є в теці модів.`,
    noOptionsFile:
      'У цій збірці ще немає options.txt. Запустіть гру один раз і спробуйте знову.',
    analysisFailed: (detail) => `Не вдалося прочитати цю збірку: ${detail}`
  }
}

export const MESSAGES: Record<Locale, Messages> = { en, ru, uk }

export const I18nContext = createContext<Messages>(en)

export function useT(): Messages {
  return useContext(I18nContext)
}

export function messagesFor(locale: string): Messages {
  return MESSAGES[locale as Locale] ?? en
}
