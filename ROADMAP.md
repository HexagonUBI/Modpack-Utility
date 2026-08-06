# Roadmap

Things known to be wanted, not yet built.

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

## Storage

- Clear the disposable categories (logs, crash reports, caches) in one action.
- Watch a folder and update sizes live rather than on demand.

## Dependencies

Version ranges are checked when deciding whether a declared incompatibility is
live. The same check is not yet used to report a dependency that is installed but
too old, because mod version strings are messy enough that it would introduce a
new class of false positives. Worth revisiting with real data.

## Attribution

Config-to-mod matching is a scored heuristic with several fallbacks (mod id,
bundled default config names, asset namespaces, filenames, initials). The
remaining misses are mods whose config name has no textual relationship to
anything in the jar. Reading the mod's own class constants would close that gap
but needs bytecode parsing, which is a large step up in complexity.
