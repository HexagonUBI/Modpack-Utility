import { homedir, platform } from 'node:os'
import { join } from 'node:path'
import type { SideRequirement } from '@shared/types'
import { isFile } from './fsutil'

export interface ModrinthFacts {
  client: SideRequirement

  server: SideRequirement

  slug: string | null
}

export interface ModrinthIndex {
  byFileName: Map<string, ModrinthFacts>

  bySha1: Map<string, ModrinthFacts>
}

const EMPTY: ModrinthIndex = { byFileName: new Map(), bySha1: new Map() }

let cached: ModrinthIndex | null = null

export async function readModrinthFacts(): Promise<ModrinthIndex> {
  if (cached) return cached

  cached = await buildIndex()
  return cached
}

async function buildIndex(): Promise<ModrinthIndex> {
  const dbPath = databasePath()
  if (dbPath === null || !(await isFile(dbPath))) return EMPTY

  try {
    const { DatabaseSync } = await import('node:sqlite')
    const database = new DatabaseSync(dbPath, { readOnly: true })

    try {
      const projects = database
        .prepare(
          "SELECT json_extract(data,'$.id') id, json_extract(data,'$.client_side') client," +
            " json_extract(data,'$.server_side') server, json_extract(data,'$.slug') slug FROM cache" +
            " WHERE data_type='project' AND data IS NOT NULL"
        )
        .all() as Array<Record<string, unknown>>

      const factsByProject = new Map<string, ModrinthFacts>()
      for (const row of projects) {
        const id = typeof row['id'] === 'string' ? row['id'] : null
        if (!id) continue

        factsByProject.set(id, {
          client: toRequirement(row['client']),
          server: toRequirement(row['server']),
          slug: typeof row['slug'] === 'string' ? row['slug'] : null
        })
      }

      const versions = database
        .prepare(
          "SELECT json_extract(data,'$.project_id') project," +
            " json_extract(data,'$.files[0].filename') fileName," +
            " json_extract(data,'$.files[0].hashes.sha1') sha1 FROM cache" +
            " WHERE data_type='version' AND data IS NOT NULL"
        )
        .all() as Array<Record<string, unknown>>

      const index: ModrinthIndex = { byFileName: new Map(), bySha1: new Map() }
      for (const row of versions) {
        const project = typeof row['project'] === 'string' ? row['project'] : null
        if (!project) continue

        const facts = factsByProject.get(project)
        if (!facts) continue

        const fileName = typeof row['fileName'] === 'string' ? row['fileName'] : null
        if (fileName) index.byFileName.set(fileName.toLowerCase(), facts)

        const sha1 = typeof row['sha1'] === 'string' ? row['sha1'] : null
        if (sha1) index.bySha1.set(sha1.toLowerCase(), facts)
      }

      return index
    } finally {
      database.close()
    }
  } catch {
    return EMPTY
  }
}

function toRequirement(raw: unknown): SideRequirement {
  if (raw === 'unsupported') return 'unsupported'
  if (raw === 'optional') return 'optional'
  return 'required'
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
