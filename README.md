# Modpack Utility

Finds every Minecraft instance on your machine, then tells you what is actually
inside them - which mod owns which config, what is left over from mods you
removed, and where the disk space went.

Built for the moment a modpack stops behaving and you need to know *why*, without
opening six folders and guessing.

## What it does

**Finds instances by looking at them, not by guessing paths.** Prism Launcher,
MultiMC, CurseForge, Modrinth, ATLauncher, GDLauncher, the FTB app, Technic, the
vanilla launcher, and plain dedicated servers. Detection reads what is actually in
a folder (`mmc-pack.json`, `minecraftinstance.json`, a `mods/` directory, ...), so
portable installs and instances on a second drive work the same as default ones.
Anything it misses, you can add by hand - the same detection runs on it.

Where a launcher keeps no per-instance manifest - the current Modrinth app stores
everything in a database - the game's own log is read for the version and loader
it was last launched with.

**Maps configs to mods.** Every entry in `config/` is scored against the mods you
have installed, by mod id, display name, jar filename, and initials (so
`etf_warnings.json` finds Entity Texture Features). Each match shows how confident
it is and why. The useful output is the inverse: config matching *nothing*
installed, which is almost always residue from a mod you removed, with a size
attached so you know whether it is worth clearing.

Configs belonging to a *disabled* mod are called out separately - those hold your
settings and are worth keeping.

**Reads mod metadata properly.** Fabric, Quilt, Forge, NeoForge and legacy
(pre-1.13) manifests, including jars bundled inside other jars. Two details do
most of the work here, and both were found by running the scanner against 50-odd
real instances:

- Fabric API ships as one jar containing about 40 nested modules, and NeoForge
  libraries such as KotlinForForge are a bare container whose only real content
  is a nested jar. Without reading inside them, healthy instances report dozens
  of missing dependencies.
- NeoForge 21 replaced the old `mandatory` boolean with `type = "required" |
  "optional" | ...`, and a modern pack declares dozens of optional compatibility
  hooks. Anything still reading only `mandatory` will call a working pack
  critically broken.

**Opens on an overview.** Total instances, launchers and versions at a glance,
plus a ring showing which instances are actually eating the disk, with the same
figures listed beside it. Click any slice to jump straight to that instance.

**Draws the dependency graph, two ways.** The whole instance as one pannable,
zoomable map, with mods stacked by how deep their dependency chain runs so
libraries settle at the bottom and the things pulling them in sit above.
Unrelated groups become separate clusters side by side, and mods that depend on
nothing are packed into a block underneath rather than stretching the map to a
width nothing can read. Hovering a mod dims everything it is not connected to.
There is also a focused view: one mod in the middle, what it needs on one side
and what needs it on the other.

Optional dependencies that are not installed are hidden by default, behind a
toggle, because a modern pack declares dozens of them and drawing every one makes
the graph look like it is describing some other instance.

**Checks version ranges before crying wolf.** Most `breaks` declarations name a
range of *old* versions. Distant Horizons declares old Iris incompatible; Sable
declares old Sodium incompatible. Ignoring the range turns a healthy pack into
five red warnings, so ranges are parsed (both Maven and npm styles) and a
conflict is only raised when the installed version genuinely falls inside one.

**Cleans up in bulk.** Select configs by preset (no matching mod, from disabled
mods, uncertain matches, backup files), review exactly what was picked, and move
the lot to the recycle bin. The same applies to unused resource packs and to old
or oversized screenshots. Nothing is ever hard-deleted, because attribution is a
heuristic and you must be able to undo it.

**Shows where the space went,** WizTree-style: a treemap plus a table whose
folders open in place, so you can see which of five worlds is the 1 GB one
without leaving the page. Config folders expand the same way.

While anything is being measured, the line underneath says which folder it is on,
written relative to the instance. Nothing above the instance folder is ever put
on screen.

**Covers resource packs and screenshots** as first-class views: which packs are
actually loaded and in what order, which are just sitting there, and a thumbnail
grid of screenshots with sizes and dates.

**Edits configs with real controls.** A bounded number becomes a slider, a
documented set becomes a dropdown, a flag becomes a switch. Forge and NeoForge
write the range and permitted values as comments above each key, so those are
read and used; `options.txt`, `.properties`, `.cfg` and JSON fall back to the
shape of the value itself, with known Minecraft ranges filled in.

Saving is surgical. It rewrites exactly the value on exactly the line it came
from, after re-reading the file to confirm the key is still there. Comments,
ordering and formatting survive untouched. `npm run check:config` proves this on
copies of your real files: same line count, same comment count, exactly one line
changed.

**Turns things on and off.** Mods toggle by renaming to and from `.disabled`,
the same convention every launcher uses. Resource packs write straight into the
game's own `resourcePacks` list in `options.txt`, so a pack switched on here is
switched on in game.

**Says which mod is broken.** A mod with a missing dependency, a disabled
dependency, or a live incompatibility is named in red in the mod list and
outlined in red on the dependency map, with the reason in its tooltip.

**Settings that stick.** Theme (follow system, light or dark), one of six muted
accent colours, a language picker, and extra folders to scan. Folders added with
the Add folder button are remembered, so a portable launcher install is added
once rather than after every restart. Everything lives in `settings.json` in the
per-user data directory.

**Points out the performance problems it can see** - unmet dependencies, memory
allocated far above or below what the pack needs, garbage-collector flags that no
longer exist in modern Java, and whether any performance mods are installed at all.

## Running it

```bash
npm install
```

```bash
npm run dev
```

## Building a release

Produces both a Windows installer and a standalone executable in `release/`:

```bash
npm run dist
```

- `Modpack-Utility-<version>-Setup.exe` installs per-user (no administrator
  prompt), lets you pick the install directory, and adds Start menu and desktop
  shortcuts.
- `Modpack-Utility-<version>-Portable.exe` is a single self-contained file that
  runs without installing anything.

Neither is code-signed, so Windows SmartScreen will show a "Windows protected
your PC" warning the first time. Choose "More info" then "Run anyway". Signing
needs a paid certificate; set `CSC_LINK` and `CSC_KEY_PASSWORD` if you have one.

To rebuild just the unpacked application directory, without installers:

```bash
npm run package
```

The app icon is generated rather than checked in as a design file:

```bash
npm run icon
```

There is also a headless scanner, useful when adding support for a launcher:

```bash
npm run scan
```

Point it at one folder instead of the known launcher roots:

```bash
npm run scan -- "D:\Games\SomeInstance"
```

## How it is put together

Electron, with all filesystem work in the main process and the renderer talking to
it only through a narrow preload bridge. React and MUI for the interface.

```
src/
  main/
    index.ts            window, security policy, lifecycle
    ipc.ts              the whole renderer-facing surface
    scanner/
      launchers.ts      where each launcher keeps instances by default
      detect.ts         content-based instance detection
      mods.ts           jar manifest parsing, nested jars, dependency checks
      configs.ts        config-to-mod attribution and scoring
      sizes.ts          sized directory tree
      zip.ts            random-access ZIP reader (no dependency)
      toml.ts           forgiving TOML reader for mods.toml
      fsutil.ts         filesystem helpers that answer "no" instead of throwing
  preload/              contextBridge API
  renderer/src/         React + MUI interface
  shared/types.ts       types crossing the IPC boundary
```

Two deliberate choices worth knowing about:

**The ZIP and TOML readers are hand-written rather than pulled from npm.** Mod jars
are opened by the hundred and only two or three small entries are ever needed from
each, so the reader seeks to those instead of decompressing archives. And a strict
TOML parser is the wrong tool for `mods.toml`, which is written by thousands of
different authors and frequently is not valid TOML - a parser that gives up on the
first violation would report "unknown mod" for a jar whose id sits perfectly
readable on line 6.

**Nothing is deleted.** The app reports and opens folders; removing files is left to
you, deliberately, because config attribution is a heuristic and no heuristic
should be wired to a delete button.

## Colour

The storage views use a categorical palette validated for colour-vision
deficiency and for contrast against both the light and dark surfaces. Categories
are assigned a fixed colour slot - never one based on size rank - so filtering or
re-sorting never repaints anything. Treemap tiles carry direct labels and the same
data is available as a table, so nothing depends on colour alone.

## Licence

MIT
