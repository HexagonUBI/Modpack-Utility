# Modpack Utility

Every Minecraft instance on your PC in one window: what is inside it, what is
broken, and what is safe to delete.

No account, no setup, nothing to configure. Open it and your instances are
already there.

## Download

Grab the latest version from the
[releases page](https://github.com/HexagonUBI/Modpack-Utility/releases/latest).

- **`Modpack-Utility-<version>-Setup.exe`** - the normal one. Installs for you
  only, so Windows never asks for an administrator password, and adds a Start
  menu and desktop shortcut.
- **`Modpack-Utility-<version>-Portable.exe`** - a single file you can run from
  anywhere, including a USB stick. Nothing gets installed.

Windows 10 or 11. The first time you run it, Windows may show a blue "Windows
protected your PC" box (SmartScreen), because the app is not signed with a paid certificate.
Click **More info**, then **Run anyway**.

The installed version keeps itself up to date. When there is a new release you
get an update icon next to the logo, and one click downloads and installs it.
After it restarts, you get the list of what changed.

## What it is for

You have twelve instances across three launchers. One of them crashes, one takes
40 GB and you do not know why, and half of them have config files left over from
mods you deleted a year ago.

This tells you which is which, without opening six folders and guessing.

## What you can do with it

**See every instance in one list.** Prism, MultiMC, CurseForge, Modrinth,
ATLauncher, GDLauncher, the FTB app, Technic, the vanilla launcher, and plain
servers. It finds them by looking inside folders rather than checking a list of
default paths, so portable installs and instances on a second drive show up too.
Anything it misses, you can add by hand.

**Find out why a pack is broken.** Mods that are missing a dependency, that need
something you switched off, or that genuinely clash with another mod are marked
in red, with the reason in plain words.

**See what needs what.** The whole pack drawn as a map you can pan and zoom,
with libraries at the bottom and the mods pulling them in above. Hover a mod and
everything unrelated fades out. Or pick one mod and see only what it needs and
what needs it.

**Find the leftovers.** Every file in `config/` gets matched to the mod that owns
it. The useful part is the ones that match nothing: settings left behind by mods
you removed. They are listed with their size, so you can see whether clearing
them is worth it. Configs belonging to a mod you only *disabled* are listed
separately, because those are worth keeping.

**See where the space went.** A treemap plus a table you can open folder by
folder, so you can find which of your five worlds is the 1 GB one without leaving
the app. Logs, crash reports, caches and Distant Horizons detail get their own
one-click clean-up, since the game rebuilds all of it anyway.

**Change settings without hunting for files.** Config files open as real
controls: sliders for numbers, dropdowns for choices, switches for on and off.
Saving changes only the line you edited and leaves every comment and blank line
exactly where it was.

**Turn things on and off.** Mods switch off the same way every launcher does it,
by renaming to `.disabled`. Resource packs write into the game's own list, so a
pack you switch on here is switched on next time you play.

**Tidy up in bulk.** Pick leftover configs, unused resource packs or old
screenshots by preset, look at exactly what got selected, and clear them in one
go. Everything goes to the recycle bin, so you can always put it back.

**In your language.** As of 2026.8.10, the app supports English, Ukrainian & Russian.
With more translations to come!


## Is it safe?

**Deleting goes to the recycle bin.** Always, by default. Matching a config to a
mod is educated guesswork, so anything it removes has to be undoable. If you
would rather have the choice each time, Settings has an "Always ask" mode that
adds a permanent delete option to the confirmation.

**It only touches what you tell it to.** Reading and measuring never changes
anything. Files change only when you switch a mod off, save a config, or confirm
a clean-up.

**Nothing leaves your computer.** No account, no telemetry, no uploads. The one
and only thing it sends is a check to GitHub for a new version, which you can
switch off in Settings.

---

# For the curious

Everything below is the technical half. Skip it happily.

## Running from source

```bash
npm install
```

```bash
npm run dev
```

Building the Windows installer and portable exe into `release/`:

```bash
npm run dist
```

There is also a headless scanner, which is the fastest way to check a detection
change against real instances:

```bash
npm run scan
```

```bash
npm run scan -- "D:\Games\SomeInstance"
```

## Things that turned out to matter

**Detection reads folders, not paths.** An instance is recognised by what is in
it (`mmc-pack.json`, `minecraftinstance.json`, a `mods/` directory and so on),
which is why portable installs work. Where a launcher keeps no per-instance
manifest, and the current Modrinth app keeps everything in a database instead,
the game's own log gives up the version and loader it last launched with.

**Nested jars are not optional.** Fabric API ships as one jar holding about 40
modules, and NeoForge libraries such as KotlinForForge are a bare container whose
only real content is a jar inside it. Without reading inside them, perfectly
healthy instances report dozens of missing dependencies.

**Dependency kind is not a boolean.** NeoForge 21 replaced `mandatory = true`
with `type = "required" | "optional" | ...`, and a modern pack declares dozens of
optional compatibility hooks. Reading only `mandatory` makes every working pack
look critically broken.

**Version ranges decide conflicts.** Most `breaks` declarations name a range of
*old* versions: Distant Horizons breaks old Iris, Sable breaks old Sodium. Ignore
the range and a healthy 94-mod pack sprouts five red warnings, so both Maven
(`[47,)`) and npm-style (`>=0.5`) ranges are parsed, and a conflict is raised only
when the installed version really falls inside one.

**Client or server is ranked by evidence.** An explicit declaration in the
manifest first, then the Modrinth metadata the launcher already cached, then
loader entrypoints, then mixins, and only then the class files. Forge and
NeoForge jars cannot be classified by their contents at all, because they compile
against the whole game and guard client code with an annotation rather than by
leaving it out, so they stay at "both" unless something authoritative says
otherwise. Being wrong towards "both" costs a download; being wrong the other way
makes someone strip a mod their server needed.

**Config writing is surgical.** A save re-reads the file, confirms the key is
still on the line it was found on, and rewrites that one value. `npm run
check:config` proves it against copies of real files: same line count, same
comment count, exactly one line different.

**The ZIP and TOML readers are hand-written.** Jars get opened by the hundred and
only two or three small entries are ever needed from each, so the reader seeks
straight to them instead of decompressing the archive. And a strict TOML parser is
the wrong tool for `mods.toml`, which is written by thousands of different authors
and often is not valid TOML: a parser that gives up on the first violation reports
"unknown mod" for a jar whose id is sitting perfectly readable on line 6.

**Updates go through the GitHub releases API.** The check runs in the main
process, the download is verified against the `latest.yml` that electron-builder
publishes beside the installer, and the release notes are parsed into components
rather than injected as HTML. The portable build links to the release page
instead, because a running exe cannot overwrite itself on Windows.

## Layout

Electron, with every filesystem call in the main process and the interface
reaching it only through a narrow preload bridge. React and MUI on top.

```
src/
  main/
    index.ts            window, security policy, lifecycle
    ipc.ts              the whole renderer-facing surface
    updater.ts          GitHub releases check, download, changelog
    scanner/
      launchers.ts      where each launcher keeps instances by default
      detect.ts         content-based instance detection
      mods.ts           jar manifests, nested jars, dependency checks
      configs.ts        config-to-mod attribution and scoring
      configFile.ts     surgical reads and writes
      sizes.ts          sized directory tree
      zip.ts            random-access ZIP reader, no dependency
      toml.ts           forgiving TOML reader for mods.toml
      fsutil.ts         filesystem helpers that answer "no" instead of throwing
  preload/              contextBridge API
  renderer/src/         React + MUI interface
  shared/types.ts       types crossing the IPC boundary
```

## Colour

The storage views use a categorical palette validated for colour-vision
deficiency and for contrast against both the light and dark surfaces. Categories
get a fixed colour slot, never one based on size rank, so filtering or re-sorting
never repaints anything. Treemap tiles carry direct labels and the same figures
are available as a table, so nothing depends on colour alone.

## Licence

Free to use, personally or commercially, on as many machines as you like. It is
not open source: modifying it, sharing a changed version, re-hosting the
installer or reusing the code elsewhere all need permission first, which you get
by opening an issue. Pull requests to this repository are welcome and need no
permission. Full terms in [LICENSE](LICENSE).
