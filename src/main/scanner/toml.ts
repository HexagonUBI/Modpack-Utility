export type TomlValue = string | number | boolean | TomlValue[] | TomlTable
export interface TomlTable {
  [key: string]: TomlValue
}

const BARE_KEY_CHARS = /[A-Za-z0-9_-]/

export function parseToml(text: string): TomlTable {
  return new TomlParser(text).parse()
}

class TomlParser {
  private pos = 0
  private readonly root: TomlTable = {}
  private current: TomlTable = this.root

  constructor(private readonly text: string) {}

  parse(): TomlTable {
    while (this.pos < this.text.length) {
      this.skipIgnorable()
      if (this.pos >= this.text.length) break

      const ch = this.text[this.pos]
      if (ch === '[') {
        this.readTableHeader()
      } else {
        this.readKeyValue()
      }
    }
    return this.root
  }

  private readTableHeader(): void {
    const lineStart = this.pos
    this.pos++
    const isArrayOfTables = this.text[this.pos] === '['
    if (isArrayOfTables) this.pos++

    const path = this.readKeyPath()
    this.skipSpaces()

    if (this.text[this.pos] === ']') this.pos++
    if (isArrayOfTables && this.text[this.pos] === ']') this.pos++

    if (path.length === 0) {
      if (this.pos === lineStart) this.pos++
      this.skipToNextLine()
      return
    }

    this.current = isArrayOfTables ? this.pushArrayTable(path) : this.ensureTable(path)
    this.skipToNextLine()
  }

  private readKeyValue(): void {
    const lineStart = this.pos
    const path = this.readKeyPath()
    this.skipSpaces()

    if (this.text[this.pos] !== '=' || path.length === 0) {
      if (this.pos === lineStart) this.pos++
      this.skipToNextLine()
      return
    }

    this.pos++
    this.skipSpaces()
    const value = this.readValue()

    const leaf = path[path.length - 1]!
    const parent = path.length > 1 ? this.ensureTable(path.slice(0, -1), this.current) : this.current
    parent[leaf] = value

    this.skipToNextLine()
  }

  private ensureTable(path: string[], from: TomlTable = this.root): TomlTable {
    let node = from
    for (const key of path) {
      const existing = node[key]
      if (Array.isArray(existing)) {
        const last = existing[existing.length - 1]
        if (isTable(last)) {
          node = last
          continue
        }
      }
      if (isTable(existing)) {
        node = existing
        continue
      }
      const created: TomlTable = {}
      node[key] = created
      node = created
    }
    return node
  }

  private pushArrayTable(path: string[]): TomlTable {
    const leaf = path[path.length - 1]!
    const parent = path.length > 1 ? this.ensureTable(path.slice(0, -1)) : this.root

    const existing = parent[leaf]
    const list: TomlValue[] = Array.isArray(existing) ? existing : []
    if (!Array.isArray(existing)) parent[leaf] = list

    const created: TomlTable = {}
    list.push(created)
    return created
  }

  private readKeyPath(): string[] {
    const path: string[] = []
    for (;;) {
      this.skipSpaces()
      const part = this.readKeyPart()
      if (part === null) break
      path.push(part)
      this.skipSpaces()
      if (this.text[this.pos] === '.') {
        this.pos++
        continue
      }
      break
    }
    return path
  }

  private readKeyPart(): string | null {
    const ch = this.text[this.pos]
    if (ch === '"' || ch === "'") return this.readValue() as string

    let key = ''
    while (this.pos < this.text.length && BARE_KEY_CHARS.test(this.text[this.pos]!)) {
      key += this.text[this.pos]
      this.pos++
    }
    return key.length > 0 ? key : null
  }

  private readValue(): TomlValue {
    const ch = this.text[this.pos]

    if (ch === '"') {
      return this.text.startsWith('"""', this.pos)
        ? this.readMultilineString('"""', true)
        : this.readQuotedString('"', true)
    }
    if (ch === "'") {
      return this.text.startsWith("'''", this.pos)
        ? this.readMultilineString("'''", false)
        : this.readQuotedString("'", false)
    }
    if (ch === '[') return this.readArray()
    if (ch === '{') return this.readInlineTable()

    return this.readBareValue()
  }

  private readQuotedString(quote: string, allowEscapes: boolean): string {
    this.pos++
    let out = ''
    while (this.pos < this.text.length) {
      const ch = this.text[this.pos]!
      if (ch === quote) {
        this.pos++
        return out
      }

      if (ch === '\n') return out
      if (allowEscapes && ch === '\\') {
        this.pos++
        out += this.readEscape()
        continue
      }
      out += ch
      this.pos++
    }
    return out
  }

  private readMultilineString(delimiter: string, allowEscapes: boolean): string {
    this.pos += 3

    if (this.text[this.pos] === '\r') this.pos++
    if (this.text[this.pos] === '\n') this.pos++

    let out = ''
    while (this.pos < this.text.length) {
      if (this.text.startsWith(delimiter, this.pos)) {
        this.pos += 3
        return out
      }
      const ch = this.text[this.pos]!
      if (allowEscapes && ch === '\\') {
        const rest = this.text.slice(this.pos + 1)
        const lineContinuation = /^[ \t]*\r?\n/.exec(rest)
        if (lineContinuation) {
          this.pos += 1 + lineContinuation[0].length
          while (this.pos < this.text.length && /[ \t\r\n]/.test(this.text[this.pos]!)) this.pos++
          continue
        }
        this.pos++
        out += this.readEscape()
        continue
      }
      out += ch
      this.pos++
    }
    return out
  }

  private readEscape(): string {
    const ch = this.text[this.pos]
    this.pos++
    switch (ch) {
      case 'n':
        return '\n'
      case 't':
        return '\t'
      case 'r':
        return '\r'
      case 'b':
        return '\b'
      case 'f':
        return '\f'
      case '"':
        return '"'
      case '\\':
        return '\\'
      case 'u':
      case 'U': {
        const width = ch === 'u' ? 4 : 8
        const hex = this.text.slice(this.pos, this.pos + width)
        if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length < width) return ch ?? ''
        this.pos += width
        return String.fromCodePoint(Number.parseInt(hex, 16))
      }
      default:

        return `\\${ch ?? ''}`
    }
  }

  private readArray(): TomlValue[] {
    this.pos++
    const values: TomlValue[] = []
    for (;;) {
      this.skipIgnorable()
      const ch = this.text[this.pos]
      if (ch === undefined) break
      if (ch === ']') {
        this.pos++
        break
      }
      if (ch === ',') {
        this.pos++
        continue
      }
      const before = this.pos
      values.push(this.readValue())
      if (this.pos === before) {
        this.pos++
      }
    }
    return values
  }

  private readInlineTable(): TomlTable {
    this.pos++
    const table: TomlTable = {}
    for (;;) {
      this.skipIgnorable()
      const ch = this.text[this.pos]
      if (ch === undefined) break
      if (ch === '}') {
        this.pos++
        break
      }
      if (ch === ',') {
        this.pos++
        continue
      }

      const before = this.pos
      const key = this.readKeyPart()
      this.skipSpaces()
      if (key === null || this.text[this.pos] !== '=') {
        if (this.pos === before) this.pos++
        continue
      }
      this.pos++
      this.skipSpaces()
      table[key] = this.readValue()
    }
    return table
  }

  private readBareValue(): TomlValue {
    let raw = ''
    while (this.pos < this.text.length) {
      const ch = this.text[this.pos]!
      if (ch === '\n' || ch === ',' || ch === ']' || ch === '}' || ch === '#') break
      raw += ch
      this.pos++
    }

    const trimmed = raw.trim()
    if (trimmed === 'true') return true
    if (trimmed === 'false') return false

    if (/^[+-]?(\d[\d_]*)(\.\d[\d_]*)?([eE][+-]?\d+)?$/.test(trimmed)) {
      const parsed = Number(trimmed.replace(/_/g, ''))
      if (Number.isFinite(parsed)) return parsed
    }

    return trimmed
  }

  private skipSpaces(): void {
    while (this.pos < this.text.length && (this.text[this.pos] === ' ' || this.text[this.pos] === '\t')) {
      this.pos++
    }
  }

  private skipIgnorable(): void {
    for (;;) {
      while (this.pos < this.text.length && /\s/.test(this.text[this.pos]!)) this.pos++
      if (this.text[this.pos] !== '#') return
      while (this.pos < this.text.length && this.text[this.pos] !== '\n') this.pos++
    }
  }

  private skipToNextLine(): void {
    while (this.pos < this.text.length && this.text[this.pos] !== '\n') this.pos++
    if (this.pos < this.text.length) this.pos++
  }
}

export function isTable(value: TomlValue | undefined): value is TomlTable {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function tomlString(table: TomlTable | undefined, key: string): string | null {
  const value = table?.[key]
  if (typeof value === 'string') return value.trim() || null
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return null
}

export function tomlBoolean(table: TomlTable | undefined, key: string): boolean | null {
  const value = table?.[key]
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true
    if (value.toLowerCase() === 'false') return false
  }
  return null
}

export function tomlTableArray(table: TomlTable | undefined, key: string): TomlTable[] {
  const value = table?.[key]
  if (Array.isArray(value)) return value.filter(isTable)
  if (isTable(value)) return [value]
  return []
}
