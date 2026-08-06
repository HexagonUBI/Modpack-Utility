import { createContext, useContext } from 'react'

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
  nav: {
    overview: string
    searchInstances: string
    rescan: string
    addFolder: string
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
    name: string
    status: string
    version: string
    loader: string
    enabled: string
    disabled: string
    all: string
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
    extraFolders: string
    extraFoldersDetail: string
    noExtraFolders: string
    stopScanning: string
    deleting: string
    deletingDetail: string
    recycleBinOnly: string
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
    presetInactive: string
    presetUncertain: string
    presetBackups: string
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
    purgeOwnedWarning: string
  }
  configEditor: {
    unsaved: (count: number) => string
    searchOptions: string
    openAsText: string
    openInEditor: string
    onePerLine: string
    saved: (count: number) => string
  }
  mods: {
    searchMods: string
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
    noManifest: string
  }
  dependencies: {
    withRequirements: string
    ofInstalled: (count: number) => string
    unmet: string
    nothingMissing: string
    listedBelow: string
    conflicts: string
    noneDeclared: string
    excludeEachOther: string
    wholeInstance: string
    oneMod: string
    highlight: string
    showDependenciesFor: string
    installed: string
    missing: string
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
    folder: string
    noFolder: string
    noFolderDetail: string
    noneInstalled: string
    noneInstalledDetail: string
    purgeTitle: (count: number) => string
    activeWarning: string
  }
  screenshots: {
    count: string
    inThisInstance: string
    totalSize: string
    olderThanSixMonths: string
    selectOld: (count: number) => string
    selectLarge: (count: number) => string
    newest: string
    oldest: string
    largest: string
    none: string
    noneDetail: string
    openFullSize: string
    purgeTitle: (count: number) => string
  }
  insights: {
    heading: string
    critical: string
    serious: string
    warning: string
    good: string
    info: string
  }
}

const en: Messages = {
  appName: 'Modpack Utility',
  nav: {
    overview: 'Overview',
    searchInstances: 'Search instances...',
    rescan: 'Rescan',
    addFolder: 'Add folder',
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
    name: 'Name',
    status: 'Status',
    version: 'Version',
    loader: 'Loader',
    enabled: 'Enabled',
    disabled: 'Disabled',
    all: 'All',
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
    presetInactive: 'From disabled mods',
    presetUncertain: 'Uncertain matches',
    presetBackups: 'Backups and .old files',
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
    purgeOwnedWarning:
      'Some of these belong to mods that are installed and enabled. Removing them resets those mods to their default settings.'
  },
  configEditor: {
    unsaved: (count) => `${count} unsaved`,
    searchOptions: 'Search options...',
    openAsText: 'Open as text',
    openInEditor: 'Open in the default editor',
    onePerLine: 'One per line',
    saved: (count) => `Saved ${count} ${count === 1 ? 'change' : 'changes'}.`
  },
  mods: {
    searchMods: 'Search mods...',
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
    noManifest: 'No readable manifest. This is normal for libraries and coremods.'
  },
  dependencies: {
    withRequirements: 'Mods with requirements',
    ofInstalled: (count) => `of ${count} installed`,
    unmet: 'Unmet requirements',
    nothingMissing: 'Nothing is missing',
    listedBelow: 'Listed below',
    conflicts: 'Declared conflicts',
    noneDeclared: 'None declared',
    excludeEachOther: 'Mods that exclude each other',
    wholeInstance: 'Whole instance',
    oneMod: 'One mod',
    highlight: 'Highlight',
    showDependenciesFor: 'Show dependencies for',
    installed: 'Installed',
    missing: 'Missing',
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
    folder: 'Folder',
    noFolder: 'No resource packs folder',
    noFolderDetail: 'This instance has no resourcepacks directory yet.',
    noneInstalled: 'No resource packs installed',
    noneInstalledDetail:
      'Packs you add to the instance will be listed here with their size and load order.',
    purgeTitle: (count) => `Move ${count} resource packs to the recycle bin?`,
    activeWarning:
      'Some of these are active in the game right now. Removing them changes how the instance looks.'
  },
  screenshots: {
    count: 'Screenshots',
    inThisInstance: 'in this instance',
    totalSize: 'Total size',
    olderThanSixMonths: 'Older than 6 months',
    selectOld: (count) => `Select older than 6 months (${count})`,
    selectLarge: (count) => `Select over 4 MB (${count})`,
    newest: 'Newest',
    oldest: 'Oldest',
    largest: 'Largest',
    none: 'No screenshots',
    noneDetail: 'Screenshots taken in this instance will show up here, with sizes and bulk cleanup.',
    openFullSize: 'Open full size',
    purgeTitle: (count) => `Move ${count} screenshots to the recycle bin?`
  },
  insights: {
    heading: 'Health and performance',
    critical: 'Critical',
    serious: 'Needs attention',
    warning: 'Worth checking',
    good: 'Looking good',
    info: 'Note'
  }
}

const ru: Messages = {
  appName: 'Modpack Utility',
  nav: {
    overview: 'Обзор',
    searchInstances: 'Поиск сборок...',
    rescan: 'Пересканировать',
    addFolder: 'Добавить папку',
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
    files: (count) => `${count.toLocaleString('ru-RU')} файлов`,
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
    name: 'Название',
    status: 'Статус',
    version: 'Версия',
    loader: 'Загрузчик',
    enabled: 'Включён',
    disabled: 'Отключён',
    all: 'Все',
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
    presetInactive: 'От отключённых модов',
    presetUncertain: 'Неточные совпадения',
    presetBackups: 'Резервные копии и .old',
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
    purgeOwnedWarning:
      'Часть из них принадлежит установленным и включённым модам. Их удаление сбросит настройки этих модов на стандартные.'
  },
  configEditor: {
    unsaved: (count) => `${count} несохранённых`,
    searchOptions: 'Поиск параметров...',
    openAsText: 'Открыть как текст',
    openInEditor: 'Открыть в редакторе по умолчанию',
    onePerLine: 'По одному в строке',
    saved: (count) =>
      `Сохранено ${count} ${slavicPlural(count, 'изменение', 'изменения', 'изменений')}.`
  },
  mods: {
    searchMods: 'Поиск модов...',
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
    noManifest: 'Нет читаемого манифеста. Это нормально для библиотек и коремодов.'
  },
  dependencies: {
    withRequirements: 'Моды с зависимостями',
    ofInstalled: (count) => `из ${count} установленных`,
    unmet: 'Неудовлетворённые зависимости',
    nothingMissing: 'Ничего не пропущено',
    listedBelow: 'Перечислены ниже',
    conflicts: 'Заявленные конфликты',
    noneDeclared: 'Не заявлено',
    excludeEachOther: 'Моды, исключающие друг друга',
    wholeInstance: 'Вся сборка',
    oneMod: 'Один мод',
    highlight: 'Подсветить',
    showDependenciesFor: 'Показать зависимости для',
    installed: 'Установлен',
    missing: 'Отсутствует',
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
    folder: 'Папка',
    noFolder: 'Нет папки resourcepacks',
    noFolderDetail: 'В этой сборке пока нет папки ресурспаков.',
    noneInstalled: 'Ресурспаки не установлены',
    noneInstalledDetail:
      'Паки, добавленные в сборку, появятся здесь с размером и порядком загрузки.',
    purgeTitle: (count) => `Переместить ${count} ресурспаков в корзину?`,
    activeWarning:
      'Часть из них сейчас активна в игре. Их удаление изменит внешний вид сборки.'
  },
  screenshots: {
    count: 'Скриншоты',
    inThisInstance: 'в этой сборке',
    totalSize: 'Общий размер',
    olderThanSixMonths: 'Старше 6 месяцев',
    selectOld: (count) => `Выбрать старше 6 месяцев (${count})`,
    selectLarge: (count) => `Выбрать больше 4 МБ (${count})`,
    newest: 'Новые',
    oldest: 'Старые',
    largest: 'Крупные',
    none: 'Нет скриншотов',
    noneDetail:
      'Скриншоты, сделанные в этой сборке, появятся здесь с размерами и массовой очисткой.',
    openFullSize: 'Открыть в полном размере',
    purgeTitle: (count) => `Переместить ${count} скриншотов в корзину?`
  },
  insights: {
    heading: 'Состояние и производительность',
    critical: 'Критично',
    serious: 'Требует внимания',
    warning: 'Стоит проверить',
    good: 'Всё хорошо',
    info: 'Заметка'
  }
}

const uk: Messages = {
  appName: 'Modpack Utility',
  nav: {
    overview: 'Огляд',
    searchInstances: 'Пошук збірок...',
    rescan: 'Пересканувати',
    addFolder: 'Додати теку',
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
    files: (count) => `${count.toLocaleString('uk-UA')} файлів`,
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
    name: 'Назва',
    status: 'Стан',
    version: 'Версія',
    loader: 'Завантажувач',
    enabled: 'Увімкнено',
    disabled: 'Вимкнено',
    all: 'Усі',
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
    presetInactive: 'Від вимкнених модів',
    presetUncertain: 'Неточні збіги',
    presetBackups: 'Резервні копії та .old',
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
    purgeOwnedWarning:
      'Частина з них належить встановленим і увімкненим модам. Їх видалення скине налаштування цих модів на стандартні.'
  },
  configEditor: {
    unsaved: (count) => `${count} незбережених`,
    searchOptions: 'Пошук параметрів...',
    openAsText: 'Відкрити як текст',
    openInEditor: 'Відкрити в типовому редакторі',
    onePerLine: 'По одному в рядку',
    saved: (count) => `Збережено ${count} ${slavicPlural(count, 'зміну', 'зміни', 'змін')}.`
  },
  mods: {
    searchMods: 'Пошук модів...',
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
    noManifest: 'Немає читабельного маніфесту. Це нормально для бібліотек і коремодів.'
  },
  dependencies: {
    withRequirements: 'Моди із залежностями',
    ofInstalled: (count) => `з ${count} встановлених`,
    unmet: 'Незадоволені залежності',
    nothingMissing: 'Нічого не бракує',
    listedBelow: 'Перелічено нижче',
    conflicts: 'Заявлені конфлікти',
    noneDeclared: 'Не заявлено',
    excludeEachOther: 'Моди, що виключають один одного',
    wholeInstance: 'Уся збірка',
    oneMod: 'Один мод',
    highlight: 'Підсвітити',
    showDependenciesFor: 'Показати залежності для',
    installed: 'Встановлено',
    missing: 'Відсутній',
    installedButDisabled: 'Встановлено, але вимкнено',
    optional: 'Необов язковий',
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
    folder: 'Тека',
    noFolder: 'Немає теки resourcepacks',
    noFolderDetail: 'У цій збірці поки немає теки ресурспаків.',
    noneInstalled: 'Ресурспаки не встановлено',
    noneInstalledDetail:
      'Паки, додані до збірки, з\'являться тут із розміром і порядком завантаження.',
    purgeTitle: (count) => `Перемістити ${count} ресурспаків до кошика?`,
    activeWarning:
      'Частина з них зараз активна у грі. Їх видалення змінить вигляд збірки.'
  },
  screenshots: {
    count: 'Знімки екрана',
    inThisInstance: 'у цій збірці',
    totalSize: 'Загальний розмір',
    olderThanSixMonths: 'Старші за 6 місяців',
    selectOld: (count) => `Вибрати старші за 6 місяців (${count})`,
    selectLarge: (count) => `Вибрати більші за 4 МБ (${count})`,
    newest: 'Нові',
    oldest: 'Старі',
    largest: 'Великі',
    none: 'Немає знімків',
    noneDetail:
      'Знімки, зроблені в цій збірці, з\'являться тут із розмірами та масовим очищенням.',
    openFullSize: 'Відкрити в повному розмірі',
    purgeTitle: (count) => `Перемістити ${count} знімків до кошика?`
  },
  insights: {
    heading: 'Стан і продуктивність',
    critical: 'Критично',
    serious: 'Потребує уваги',
    warning: 'Варто перевірити',
    good: 'Усе добре',
    info: 'Примітка'
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
