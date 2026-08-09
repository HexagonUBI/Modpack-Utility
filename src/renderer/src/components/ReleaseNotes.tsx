import { Fragment, type ReactNode } from 'react'
import { Box, Link, Typography } from '@mui/material'

type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'quote'; lines: string[] }
  | { kind: 'code'; text: string }
  | { kind: 'rule' }
  | { kind: 'paragraph'; lines: string[] }

const INLINE =
  /(`[^`]+`)|(\*\*[^*]+\*\*)|(__[^_]+__)|(\*[^*\n]+\*)|(\[[^\]\n]+\]\([^)\s]+\))|(https?:\/\/[^\s)<>]+)/g

interface ReleaseNotesProps {
  text: string
  empty: string
}

export default function ReleaseNotes({ text, empty }: ReleaseNotesProps) {
  const blocks = parseBlocks(text)

  if (blocks.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {empty}
      </Typography>
    )
  }

  return (
    <Box sx={{ '& > *:first-of-type': { mt: 0 } }}>
      {blocks.map((block, index) => (
        <Fragment key={index}>{renderBlock(block)}</Fragment>
      ))}
    </Box>
  )
}

function renderBlock(block: Block): ReactNode {
  switch (block.kind) {
    case 'heading':
      return (
        <Typography
          variant={block.level <= 2 ? 'subtitle1' : 'subtitle2'}
          sx={{ mt: 2.5, mb: 0.75, fontWeight: 700 }}
        >
          {inline(block.text)}
        </Typography>
      )

    case 'list':
      return (
        <Box
          component={block.ordered ? 'ol' : 'ul'}
          sx={{ mt: 0.5, mb: 1.5, pl: 3, display: 'flex', flexDirection: 'column', gap: 0.5 }}
        >
          {block.items.map((item, index) => (
            <Typography key={index} component="li" variant="body2" sx={{ lineHeight: 1.6 }}>
              {inline(item)}
            </Typography>
          ))}
        </Box>
      )

    case 'quote':
      return (
        <Box
          sx={{
            my: 1.5,
            pl: 1.5,
            borderLeft: '3px solid',
            borderColor: 'divider'
          }}
        >
          <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
            {inline(block.lines.join(' '))}
          </Typography>
        </Box>
      )

    case 'code':
      return (
        <Box
          component="pre"
          sx={{
            my: 1.5,
            p: 1.5,
            borderRadius: 1,
            backgroundColor: 'action.hover',
            fontFamily: 'ui-monospace, monospace',
            fontSize: 12.5,
            lineHeight: 1.55,
            overflowX: 'auto'
          }}
        >
          {block.text}
        </Box>
      )

    case 'rule':
      return <Box sx={{ my: 2, borderTop: '1px solid', borderColor: 'divider' }} />

    case 'paragraph':
      return (
        <Typography variant="body2" sx={{ my: 1.25, lineHeight: 1.65 }}>
          {inline(block.lines.join(' '))}
        </Typography>
      )
  }
}

function parseBlocks(text: string): Block[] {
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n')
  const blocks: Block[] = []

  let paragraph: string[] = []
  let quote: string[] = []
  let list: { ordered: boolean; items: string[] } | null = null

  const flush = (): void => {
    if (paragraph.length > 0) {
      blocks.push({ kind: 'paragraph', lines: paragraph })
      paragraph = []
    }
    if (quote.length > 0) {
      blocks.push({ kind: 'quote', lines: quote })
      quote = []
    }
    if (list) {
      blocks.push({ kind: 'list', ordered: list.ordered, items: list.items })
      list = null
    }
  }

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!

    if (/^\s*```/.test(line)) {
      flush()
      const body: string[] = []
      index++
      while (index < lines.length && !/^\s*```/.test(lines[index]!)) {
        body.push(lines[index]!)
        index++
      }
      if (body.length > 0) blocks.push({ kind: 'code', text: body.join('\n') })
      continue
    }

    if (line.trim() === '') {
      flush()
      continue
    }

    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      flush()
      blocks.push({ kind: 'rule' })
      continue
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      flush()
      blocks.push({ kind: 'heading', level: heading[1]!.length, text: heading[2]!.trim() })
      continue
    }

    const quoted = /^\s*>\s?(.*)$/.exec(line)
    if (quoted) {
      if (paragraph.length > 0 || list) flush()
      quote.push(quoted[1]!)
      continue
    }

    const item = /^\s*(?:([-*+])|(\d+)[.)])\s+(.*)$/.exec(line)
    if (item) {
      if (paragraph.length > 0 || quote.length > 0) flush()
      const ordered = item[2] !== undefined
      if (list && list.ordered !== ordered) flush()
      if (!list) list = { ordered, items: [] }
      list.items.push(stripTags(item[3]!.trim()))
      continue
    }

    if (list) {
      const last = list.items.length - 1
      if (last >= 0) {
        list.items[last] = `${list.items[last]!} ${line.trim()}`
        continue
      }
    }

    if (quote.length > 0) flush()
    paragraph.push(stripTags(line.trim()))
  }

  flush()
  return blocks
}

function stripTags(text: string): string {
  return text.replace(/<\/?[a-zA-Z][^>]*>/g, '').trim()
}

function inline(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let cursor = 0
  let key = 0

  INLINE.lastIndex = 0
  for (let match = INLINE.exec(text); match !== null; match = INLINE.exec(text)) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index))
    cursor = match.index + match[0].length

    const token = match[0]

    if (token.startsWith('`')) {
      nodes.push(
        <Box
          key={key++}
          component="code"
          sx={{
            px: 0.6,
            py: 0.15,
            borderRadius: 0.75,
            backgroundColor: 'action.hover',
            fontFamily: 'ui-monospace, monospace',
            fontSize: '0.86em'
          }}
        >
          {token.slice(1, -1)}
        </Box>
      )
      continue
    }

    if (token.startsWith('**') || token.startsWith('__')) {
      nodes.push(
        <Box key={key++} component="strong" sx={{ fontWeight: 700 }}>
          {token.slice(2, -2)}
        </Box>
      )
      continue
    }

    if (token.startsWith('*')) {
      nodes.push(
        <Box key={key++} component="em">
          {token.slice(1, -1)}
        </Box>
      )
      continue
    }

    if (token.startsWith('[')) {
      const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token)
      if (link) {
        nodes.push(externalLink(key++, link[2]!, link[1]!))
        continue
      }
      nodes.push(token)
      continue
    }

    nodes.push(externalLink(key++, token, shortenUrl(token)))
  }

  if (cursor < text.length) nodes.push(text.slice(cursor))
  return nodes
}

function externalLink(key: number, url: string, label: string): ReactNode {
  if (!url.startsWith('https://')) return <Fragment key={key}>{label}</Fragment>

  return (
    <Link
      key={key}
      component="button"
      type="button"
      underline="hover"
      onClick={() => void window.api.openExternal(url)}
      sx={{ verticalAlign: 'baseline', fontSize: 'inherit', fontFamily: 'inherit' }}
    >
      {label}
    </Link>
  )
}

function shortenUrl(url: string): string {
  const pull = /^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/(\d+)$/.exec(url)
  if (pull) return `#${pull[1]}`

  try {
    const parsed = new URL(url)
    return `${parsed.hostname.replace(/^www\./, '')}${parsed.pathname === '/' ? '' : parsed.pathname}`
  } catch {
    return url
  }
}
