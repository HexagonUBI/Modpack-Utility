import type { ModFile, ResourcePackEntry, ShaderPackEntry } from '@shared/types'
import type { Messages } from './i18n'

export type ExportFormat = 'html' | 'markdown' | 'text'

export interface ExportEntry {
  iconDataUrl: string | null
  name: string
  url: string | null
  version: string | null
  authors: string[]
}

export interface ExportSection {
  title: string
  entries: ExportEntry[]
}

export interface ExportDocument {
  title: string
  subtitle: string
  generated: string
  sections: ExportSection[]
}

export const EXPORT_EXTENSION: Record<ExportFormat, string> = {
  html: 'html',
  markdown: 'md',
  text: 'txt'
}

export function modEntry(mod: ModFile): ExportEntry {
  return {
    iconDataUrl: mod.iconDataUrl,
    name: mod.name ?? mod.modId ?? mod.fileName,
    url: modUrl(mod),
    version: mod.version,
    authors: mod.authors
  }
}

export function packEntry(pack: ResourcePackEntry): ExportEntry {
  return {
    iconDataUrl: pack.iconDataUrl,
    name: packName(pack.name),
    url: null,
    version: null,
    authors: []
  }
}

export function shaderEntry(pack: ShaderPackEntry): ExportEntry {
  return {
    iconDataUrl: null,
    name: packName(pack.name),
    url: null,
    version: null,
    authors: []
  }
}

const SECTION_SIGN = String.fromCharCode(167)

const COLOUR_CODE = new RegExp('[' + SECTION_SIGN + '&][0-9a-fk-or]', 'gi')

function packName(fileName: string): string {
  const stripped = fileName
    .replace(/\.zip$/i, '')
    .replace(COLOUR_CODE, '')
    .replace(/\s+/g, ' ')
    .trim()

  return stripped.length > 0 ? stripped : fileName
}

const EXPORT_ICON_PIXELS = 48

export async function shrinkIcons(sources: Array<string | null>): Promise<Record<string, string>> {
  const unique = [...new Set(sources.filter((source): source is string => source !== null))]
  const shrunk: Record<string, string> = {}

  await Promise.all(
    unique.map(async (source) => {
      const smaller = await shrinkIcon(source)
      if (smaller !== null && smaller.length < source.length) shrunk[source] = smaller
    })
  )
  return shrunk
}

async function shrinkIcon(dataUrl: string): Promise<string | null> {
  try {
    const image = new Image()
    image.src = dataUrl
    await image.decode()

    const canvas = document.createElement('canvas')
    canvas.width = EXPORT_ICON_PIXELS
    canvas.height = EXPORT_ICON_PIXELS

    const context = canvas.getContext('2d')
    if (context === null) return null

    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(image, 0, 0, EXPORT_ICON_PIXELS, EXPORT_ICON_PIXELS)

    const webp = canvas.toDataURL('image/webp', 0.9)
    if (webp.startsWith('data:image/webp')) return webp

    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
}

function modUrl(mod: ModFile): string | null {
  if (mod.slug) return `https://modrinth.com/mod/${mod.slug}`
  if (mod.homepage && /^https?:\/\//i.test(mod.homepage)) return mod.homepage
  return null
}

export function renderExport(document: ExportDocument, format: ExportFormat, t: Messages): string {
  switch (format) {
    case 'html':
      return renderHtml(document, t)
    case 'markdown':
      return renderMarkdown(document, t)
    case 'text':
      return renderText(document, t)
  }
}

function renderMarkdown(document: ExportDocument, t: Messages): string {
  const lines: string[] = [`# ${document.title}`, '', `${document.subtitle}`, '']

  for (const section of document.sections) {
    if (section.entries.length === 0) continue

    lines.push(`## ${section.title} (${section.entries.length})`, '')
    lines.push(`| ${t.common.name} | ${t.common.version} | ${t.mods.authors} |`)
    lines.push('| --- | --- | --- |')

    for (const entry of section.entries) {
      const name = entry.url
        ? `[${escapeCell(entry.name)}](${entry.url})`
        : escapeCell(entry.name)
      lines.push(`| ${name} | ${escapeCell(entry.version ?? '')} | ${escapeCell(entry.authors.join(', '))} |`)
    }
    lines.push('')
  }

  lines.push('---', '', `*${document.generated}*`, '')
  return lines.join('\n')
}

function renderText(document: ExportDocument, t: Messages): string {
  const lines: string[] = [document.title, document.subtitle, '']

  for (const section of document.sections) {
    if (section.entries.length === 0) continue

    const heading = `${section.title} (${section.entries.length})`
    lines.push(heading, '='.repeat(heading.length))

    const nameWidth = widest(section.entries.map((entry) => entry.name), t.common.name)
    const versionWidth = widest(
      section.entries.map((entry) => entry.version ?? ''),
      t.common.version
    )

    lines.push(
      `${t.common.name.padEnd(nameWidth)}  ${t.common.version.padEnd(versionWidth)}  ${t.mods.authors}`
    )

    for (const entry of section.entries) {
      const authors = entry.authors.join(', ')
      lines.push(
        `${entry.name.padEnd(nameWidth)}  ${(entry.version ?? '').padEnd(versionWidth)}  ${authors}`.trimEnd()
      )
    }
    lines.push('')
  }

  lines.push(document.generated, '')
  return lines.join('\r\n')
}

function widest(values: string[], header: string): number {
  return values.reduce((longest, value) => Math.max(longest, value.length), header.length)
}

function renderHtml(document: ExportDocument, t: Messages): string {
  const sections = document.sections
    .filter((section) => section.entries.length > 0)
    .map((section) => {
      const rows = section.entries
        .map((entry) => {
          const icon = entry.iconDataUrl
            ? `<img src="${escapeHtml(entry.iconDataUrl)}" alt="" width="28" height="28">`
            : '<span class="noicon"></span>'

          const name = entry.url
            ? `<a href="${escapeHtml(entry.url)}" rel="noreferrer noopener">${escapeHtml(entry.name)}</a>`
            : escapeHtml(entry.name)

          return [
            '      <tr>',
            `        <td class="icon">${icon}</td>`,
            `        <td class="name">${name}</td>`,
            `        <td class="version">${escapeHtml(entry.version ?? '')}</td>`,
            `        <td class="authors">${escapeHtml(entry.authors.join(', '))}</td>`,
            '      </tr>'
          ].join('\n')
        })
        .join('\n')

      return [
        `    <h2>${escapeHtml(section.title)} <span class="count">${section.entries.length}</span></h2>`,
        '    <table>',
        '      <tr>',
        '        <th></th>',
        `        <th>${escapeHtml(t.common.name)}</th>`,
        `        <th>${escapeHtml(t.common.version)}</th>`,
        `        <th>${escapeHtml(t.mods.authors)}</th>`,
        '      </tr>',
        rows,
        '    </table>'
      ].join('\n')
    })
    .join('\n')

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(document.title)}</title>
    <style>
${STYLE}
    </style>
  </head>
  <body>
    <h1>${escapeHtml(document.title)}</h1>
    <p class="meta">${escapeHtml(document.subtitle)}</p>
${sections}
    <p class="footer">${escapeHtml(document.generated)}</p>
  </body>
</html>
`
}

const STYLE = `      :root {
        color-scheme: light dark;
        --ink: #151514;
        --dim: #5c5b57;
        --line: rgba(17, 17, 17, 0.12);
        --paper: #ffffff;
        --link: #33597f;
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --ink: #e8e8e6;
          --dim: #a3a39e;
          --line: rgba(255, 255, 255, 0.12);
          --paper: #1a1a1a;
          --link: #87abc9;
        }
      }
      body {
        margin: 0 auto;
        padding: 40px 24px 64px;
        max-width: 900px;
        background: var(--paper);
        color: var(--ink);
        font: 15px/1.55 system-ui, -apple-system, "Segoe UI", sans-serif;
      }
      h1 { margin: 0 0 4px; font-size: 26px; letter-spacing: -0.015em; }
      h2 { margin: 40px 0 12px; font-size: 18px; }
      .count {
        margin-left: 6px;
        padding: 2px 8px;
        border-radius: 20px;
        background: var(--line);
        font-size: 13px;
        font-weight: 500;
        vertical-align: middle;
      }
      .meta, .footer { color: var(--dim); font-size: 13px; }
      .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid var(--line); }
      table { width: 100%; border-collapse: collapse; }
      th {
        padding: 0 12px 8px 0;
        border-bottom: 1px solid var(--line);
        color: var(--dim);
        font-size: 12px;
        font-weight: 600;
        text-align: left;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      td { padding: 7px 12px 7px 0; border-bottom: 1px solid var(--line); vertical-align: middle; }
      td.icon { width: 28px; padding-right: 14px; }
      td.icon img { display: block; border-radius: 5px; image-rendering: auto; }
      .noicon { display: block; width: 28px; height: 28px; border-radius: 5px; background: var(--line); }
      td.name { font-weight: 600; }
      td.version, td.authors { color: var(--dim); }
      td.version { white-space: nowrap; font-variant-numeric: tabular-nums; }
      a { color: var(--link); text-decoration: none; }
      a:hover { text-decoration: underline; }
      @media print {
        body { max-width: none; padding: 0; }
        a { color: inherit; }
      }`

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
}
