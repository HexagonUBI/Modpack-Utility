# Roadmap

Things known to be wanted, not yet built.

- Change logo font to Comfortaa

## Settings

The settings screen exists and persists theme, accent colour, language and extra
scan folders to `settings.json` in the per-user data directory. What is still
missing:

- **Finish the translation coverage.** English, Russian and Ukrainian all exist
  in `i18n.ts` and the shell, overview, settings, tab bar and the main table
  headers use them. Still hardcoded in English: the health and performance
  insight text, and most of the longer explanatory sentences inside individual
  tabs. The catalogue and the plumbing are done, so each remaining string is a
  mechanical move rather than new work.
- Per-instance overrides, so a single instance can be pinned to a different
  scan behaviour.

## Instance work

- Enable and disable mods in place, by renaming to and from `.disabled`.
- Compare two instances and show what differs.
- Remember previous scans so "this config appeared after you removed that mod"
  can be stated from history rather than inferred.
- Global Screenshots manager (tracks all instance screenshots and shows them in the same place, with a tag for which instance it is from)
- World editing (Default datapacks, deleting registries)
- Changing java arguments

## Storage

- Clear the disposable categories (logs, crash reports, caches) in one action.
- Watch a folder and update sizes live rather than on demand.
- Settings should have "Always Ask" for deletion, and then it would prompt you whether you want to permanently delete files or just move them to the recycle bin.

## Dependencies

Version ranges are checked when deciding whether a declared incompatibility is
live. The same check is not yet used to report a dependency that is installed but
too old, because mod version strings are messy enough that it would introduce a
new class of false positives. Worth revisiting with real data.

- Proper check for .jar to use a loader (especially if its multiloader)
- When in dependency map (trees), right-clicking a mod would open context menu where you can do quick actions on it, such as:
  - Toggling the mod (on/off)
  - Open it in folder
  - Delete the mod (permanently with a warning, holding shift will skip the warning when deleting)
  - Quick size info (greyed out text)
- Reload the instance data for latest up-to-date data
- Fix for errors (if dependency is missing, get the required mod and install it when prompted)
- When checks for latest data, check for mod updates and highlight it with a blue circle with changelog icon or whatever is indicating an update. Clicking on it would open a menu that shows latest changelogs and lets you update the mod by a button
^ same system goes to Shaderpacks and Resourcepacks
- When highlighting a mod in a map, instead of instant focus mode it should smoothly transition the zooming
- When there are dependency errors, should have a panel at the right (that can be collapsed) instead of what it is right now (and have scroll ability)

## Attribution

Config-to-mod matching is a scored heuristic with several fallbacks (mod id,
bundled default config names, asset namespaces, filenames, initials). The
remaining misses are mods whose config name has no textual relationship to
anything in the jar. Reading the mod's own class constants would close that gap
but needs bytecode parsing, which is a large step up in complexity.

## Benchmark Tools

A special tab (after overview) which would track whether you have an instance (or multiple) launched in the background, then track perfomance of it until you close it(or set manual mode where you start and stop benchmarking), which would then show all perfomance stats with average framerates, latency, memory usage etc (both in diagrams with history and some stats)