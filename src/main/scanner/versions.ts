export type RangeResult = boolean | null

export function parseVersion(raw: string): number[] | null {
  if (!raw) return null

  const withoutBuild = raw.split('+')[0]!.trim().replace(/^[vV]/, '')
  const match = /^\d+(?:\.\d+)*/.exec(withoutBuild)
  if (!match) return null

  return match[0].split('.').map((part) => Number.parseInt(part, 10))
}

export function compareVersions(a: string, b: string): number | null {
  const left = parseVersion(a)
  const right = parseVersion(b)
  if (!left || !right) return null

  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0)
    if (diff !== 0) return diff < 0 ? -1 : 1
  }
  return 0
}

export function satisfies(version: string | null, range: string | null): RangeResult {
  const trimmedRange = range?.trim()

  if (!trimmedRange || trimmedRange === '*' || trimmedRange === 'any') return true
  if (!version) return null
  if (!parseVersion(version)) return null

  const alternatives = trimmedRange.split('||')
  let sawUnknown = false

  for (const alternative of alternatives) {
    const result = satisfiesSingle(version, alternative.trim())
    if (result === true) return true
    if (result === null) sawUnknown = true
  }

  return sawUnknown ? null : false
}

function satisfiesSingle(version: string, range: string): RangeResult {
  if (!range || range === '*') return true
  if (range.startsWith('[') || range.startsWith('(')) return satisfiesMaven(version, range)
  return satisfiesComparators(version, range)
}

function satisfiesMaven(version: string, range: string): RangeResult {
  const match = /^([[(])\s*([^,\])]*)\s*(,)?\s*([^,\])]*)\s*([\])])$/.exec(range)
  if (!match) return null

  const [, openBracket, rawLower, comma, rawUpper, closeBracket] = match
  const lower = rawLower?.trim() ?? ''
  const upper = rawUpper?.trim() ?? ''

  if (!comma) {
    if (!lower) return null
    const comparison = compareVersions(version, lower)
    return comparison === null ? null : comparison === 0
  }

  if (lower) {
    const comparison = compareVersions(version, lower)
    if (comparison === null) return null
    if (openBracket === '[' ? comparison < 0 : comparison <= 0) return false
  }

  if (upper) {
    const comparison = compareVersions(version, upper)
    if (comparison === null) return null
    if (closeBracket === ']' ? comparison > 0 : comparison >= 0) return false
  }

  return true
}

function satisfiesComparators(version: string, range: string): RangeResult {
  const parts = range.split(/[\s,]+/).filter(Boolean)
  if (parts.length === 0) return true

  let sawUnknown = false
  for (const part of parts) {
    const result = satisfiesComparator(version, part)
    if (result === false) return false
    if (result === null) sawUnknown = true
  }
  return sawUnknown ? null : true
}

function satisfiesComparator(version: string, comparator: string): RangeResult {
  if (comparator === '*' || comparator === 'any') return true

  const match = /^(>=|<=|>|<|=|\^|~)?\s*(.+)$/.exec(comparator)
  if (!match) return null

  const operator = match[1] ?? '='
  const target = match[2]!.trim()

  if (/[.x*]$/i.test(target) && /[x*]/i.test(target)) {
    const prefix = target.replace(/\.[x*]+$/i, '')
    return withinCaretOrTilde(version, prefix, 'tilde')
  }

  if (operator === '^') return withinCaretOrTilde(version, target, 'caret')
  if (operator === '~') return withinCaretOrTilde(version, target, 'tilde')

  const comparison = compareVersions(version, target)
  if (comparison === null) return null

  switch (operator) {
    case '>=':
      return comparison >= 0
    case '<=':
      return comparison <= 0
    case '>':
      return comparison > 0
    case '<':
      return comparison < 0
    default:
      return comparison === 0
  }
}

function withinCaretOrTilde(version: string, target: string, mode: 'caret' | 'tilde'): RangeResult {
  const base = parseVersion(target)
  const actual = parseVersion(version)
  if (!base || !actual) return null

  const lower = compareVersions(version, target)
  if (lower === null || lower < 0) return lower === null ? null : false

  const bumpIndex = mode === 'tilde' ? Math.min(1, base.length - 1) : base[0] === 0 ? 1 : 0
  const ceiling = base.slice(0, bumpIndex + 1)
  ceiling[bumpIndex] = (ceiling[bumpIndex] ?? 0) + 1

  for (let i = 0; i <= bumpIndex; i++) {
    const actualPart = actual[i] ?? 0
    const ceilingPart = ceiling[i] ?? 0
    if (actualPart < ceilingPart) return true
    if (actualPart > ceilingPart) return false
  }
  return false
}
