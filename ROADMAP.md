# Roadmap

Things known to be wanted, not yet built.

- Ability to import/export files (for example import configs in the folder through a menu or drag&drop in a userfriendly way)

- When selecting anything in modlist, selection should save when in other Instance tabs (resets if going out of instance itself)

- Client/host tracking is accurate where the evidence allows and says "both"
  where it does not. Measured against the Modrinth cache as ground truth, the
  heuristic path is 66/66 correct; before the rework it was 181/235, with 30
  both-sided libraries wrongly called client-only. Forge and NeoForge packs are
  mostly "both" because their bytecode cannot distinguish a client-only mod from
  a both-sided one - the only way to improve them is more authoritative data.
  Worth doing next: query the Modrinth and CurseForge APIs for mods missing from
  the local cache, which would cover the Forge packs and would also fill in the
  required/optional split for mods the launcher has never downloaded.

- Ability to quick export an instance as a modpack in .mrpack, .zip and support for CurseForge & Prism Launchers.
Exporting would have multiple options where you can choose in which launchers you can export the instance (along with asking for basic data like name, version and description, then converting it for each launcher pack properly). You could also be able to select a "For server" option, where it would additionally export a .zip archive with modpack specifically to put to server, if you have one.

You can also choose which folders/files specifically are to be exported (server archive takes only specific ones by default which you can edit as well, but if any of them are checked out on normal export it will prompt you if you want them gone from server too). These are all cached/saved so when you're exporting next time they are still chosen like you did before (with a button to quickly reset that selection)
If there are any new files appearing after latest export, it will highlight them as green (folder will have green circle next to it if there are new files inside of it), files that got removed since last export will still show up, but wont be interactable and just be highlighted with red (that one is hidden by default, can unhide them with a checkmark filter)

- Feature to export used resources in instance:
Mods list with this formatting

Mods:
mod-icon | mod-name(hyperlink) | version | authors
ResourcePacks:
[same thing]
ShaderPacks:
[same thing]

- Feature to have a snapshot (automatically creates up to 5 snapshots which you can look through (only creates new one when something changes))
You can "Pin" the snapshot with info you'd like, and then next snapshot will always base off it and show changes between the two.
Those snapshots will let you generate a changelog in multiple ways: HTML, Plain Text, Markdown and in .md/.txt


## Settings

The settings screen exists and persists theme, accent colour, language and extra
scan folders to `settings.json` in the per-user data directory. Translation is
complete: every string the interface shows is in `i18n.ts` in English, Russian
and Ukrainian, including insight text, progress messages, config attribution
reasons and error messages. What is still missing:

- A fourth language would only need a new entry in `MESSAGES` and `LANGUAGES`.
- Per-instance overrides, so a single instance can be pinned to a different
  scan behaviour.

## Instance work

- Compare two instances and show what differs.
- Remember previous scans so "this config appeared after you removed that mod"
  can be stated from history rather than inferred.
- Global Screenshots manager (tracks all instance screenshots and shows them in the same place, with a tag for which instance it is from)
- World editing (Default datapacks, deleting registries)
- Changing java arguments

## Storage

- Watch a folder and update sizes live rather than on demand.
- Persist the latest scan across app restarts. Within a session it now survives
  settings changes; the bug where changing the language re-ran the whole scan and
  discarded measured sizes is fixed (`notify` in `App.tsx` keeps the scan
  callbacks free of `messages`).
- When scanning disk space, when it shows a progress bar in the overview button, should also show a progress bar in the main frame where the scanning is happening, but only for each instance/file scanned. (In few words - overview button shows progress bar, main page should show one personally for each instance scanned so user knows that it's not stuck on loading)

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
- When hovering over a mod in dependency tree map, should show a little popup with Mod's name, version and authors, as well as it's icon (should take around 0.30 seconds of hovering until it pops up like a tooltip)
- Duplicate mod detection

## Attribution

Config-to-mod matching is a scored heuristic with several fallbacks (mod id,
bundled default config names, Modrinth project slug, filenames, initials). The
remaining misses are mods whose config name has no textual relationship to
anything in the jar. Reading the mod's own class constants would close that gap
but needs bytecode parsing, which is a large step up in complexity.

Two cheaper ideas were tried and rejected against the real 243-config instance,
so do not re-add them without new evidence:

- **Asset namespaces.** A jar containing `data/byg/` does not own `byg` - mods
  ship compat data under other mods' namespaces, so this attributed the BYG
  config to Create Railways. `resourceNamespaces` is still parsed but is not
  safe as a matching key on its own.
- **Sniffing the config text for a known mod id.** Mod ids that are ordinary
  words (`create`, `flow`, `ears`) matched inside prose and comments, giving 28
  matches of which none were right.

## Benchmark Tools

A special tab (after overview) which would track whether you have an instance (or multiple) launched in the background, then track perfomance of it until you close it(or set manual mode where you start and stop benchmarking), which would then show all perfomance stats with average framerates, latency, memory usage etc (both in diagrams with history and some stats)

## Notebook
Notebook would be another tab where you can note things down per instance (and also see notes from other launchers)