import { homedir, platform } from 'node:os'
import { join } from 'node:path'
import { isFile } from './fsutil'

export interface ModrinthProfileRow {
  name: string | null
  iconPath: string | null

  lastPlayed: number | null
}

export type ModrinthProfileIndex = Map<string, ModrinthProfileRow>

const EMPTY: ModrinthProfileIndex = new Map()

export async function readModrinthProfiles(): Promise<ModrinthProfileIndex> {
  const dbPath = databasePath()
  if (dbPath === null || !(await isFile(dbPath))) return EMPTY

  try {
    const { DatabaseSync } = await import('node:sqlite')
    const database = new DatabaseSync(dbPath, { readOnly: true })

    try {
      const rows = database
        .prepare('SELECT path, name, icon_path, last_played FROM instances')
        .all() as Array<Record<string, unknown>>

      const index: ModrinthProfileIndex = new Map()
      for (const row of rows) {
        const folder = typeof row['path'] === 'string' ? row['path'] : null
        if (!folder) continue

        index.set(folder.toLowerCase(), {
          name: typeof row['name'] === 'string' ? row['name'] : null,
          iconPath: typeof row['icon_path'] === 'string' ? row['icon_path'] : null,
          lastPlayed: typeof row['last_played'] === 'number' ? row['last_played'] : null
        })
      }
      return index
    } finally {
      database.close()
    }
  } catch {
    return EMPTY
  }
}

function databasePath(): string | null {
  const home = homedir()

  switch (platform()) {
    case 'win32':
      return join(process.env['APPDATA'] || join(home, 'AppData', 'Roaming'), 'ModrinthApp', 'app.db')
    case 'darwin':
      return join(home, 'Library', 'Application Support', 'ModrinthApp', 'app.db')
    default:
      return join(process.env['XDG_DATA_HOME'] || join(home, '.local', 'share'), 'ModrinthApp', 'app.db')
  }
}
