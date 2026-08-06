import { open, type FileHandle } from 'node:fs/promises'
import { inflateRaw } from 'node:zlib'
import { promisify } from 'node:util'

const inflateRawAsync = promisify(inflateRaw)

const SIG_EOCD = 0x06054b50
const SIG_EOCD64 = 0x06064b50
const SIG_EOCD64_LOCATOR = 0x07064b50
const SIG_CENTRAL_HEADER = 0x02014b50
const SIG_LOCAL_HEADER = 0x04034b50

const EOCD_FIXED_SIZE = 22
const CENTRAL_HEADER_FIXED_SIZE = 46
const LOCAL_HEADER_FIXED_SIZE = 30
const MAX_ZIP_COMMENT = 0xffff
const U32_MAX = 0xffffffff

const METHOD_STORE = 0
const METHOD_DEFLATE = 8

const FLAG_ENCRYPTED = 0x0001

export interface ZipEntry {
  fileName: string
  compressedSize: number
  uncompressedSize: number
  compressionMethod: number
  localHeaderOffset: number
  flags: number
  isDirectory: boolean
}

interface ByteSource {
  size: number
  read(position: number, length: number): Promise<Buffer>
  close(): Promise<void>
}

class FileSource implements ByteSource {
  constructor(
    private readonly handle: FileHandle,
    readonly size: number
  ) {}

  async read(position: number, length: number): Promise<Buffer> {
    if (length <= 0) return Buffer.alloc(0)
    const buffer = Buffer.allocUnsafe(length)
    let filled = 0
    while (filled < length) {
      const { bytesRead } = await this.handle.read(buffer, filled, length - filled, position + filled)
      if (bytesRead === 0) break
      filled += bytesRead
    }
    return filled === length ? buffer : buffer.subarray(0, filled)
  }

  async close(): Promise<void> {
    await this.handle.close().catch(() => undefined)
  }
}

class BufferSource implements ByteSource {
  constructor(private readonly buffer: Buffer) {}

  get size(): number {
    return this.buffer.length
  }

  async read(position: number, length: number): Promise<Buffer> {
    return this.buffer.subarray(position, position + Math.max(0, length))
  }

  async close(): Promise<void> {
  }
}

export class ZipReader {
  private constructor(
    private readonly source: ByteSource,
    private readonly entryList: ZipEntry[],
    private readonly byName: Map<string, ZipEntry>,

    private readonly byLowerName: Map<string, ZipEntry>
  ) {}

  static async open(filePath: string): Promise<ZipReader> {
    const handle = await open(filePath, 'r')
    try {
      const { size } = await handle.stat()
      return await ZipReader.fromSource(new FileSource(handle, size))
    } catch (error) {
      await handle.close().catch(() => undefined)
      throw error
    }
  }

  static async fromBuffer(buffer: Buffer): Promise<ZipReader> {
    return ZipReader.fromSource(new BufferSource(buffer))
  }

  private static async fromSource(source: ByteSource): Promise<ZipReader> {
    const entries = await readCentralDirectory(source)

    const byName = new Map<string, ZipEntry>()
    const byLowerName = new Map<string, ZipEntry>()
    for (const entry of entries) {
      if (!byName.has(entry.fileName)) byName.set(entry.fileName, entry)
      const lower = entry.fileName.toLowerCase()
      if (!byLowerName.has(lower)) byLowerName.set(lower, entry)
    }

    return new ZipReader(source, entries, byName, byLowerName)
  }

  entries(): readonly ZipEntry[] {
    return this.entryList
  }

  find(name: string): ZipEntry | null {
    return this.byName.get(name) ?? this.byLowerName.get(name.toLowerCase()) ?? null
  }

  has(name: string): boolean {
    return this.find(name) !== null
  }

  async read(entry: ZipEntry): Promise<Buffer> {
    if ((entry.flags & FLAG_ENCRYPTED) !== 0) {
      throw new Error(`Entry is encrypted: ${entry.fileName}`)
    }

    const header = await this.source.read(entry.localHeaderOffset, LOCAL_HEADER_FIXED_SIZE)
    if (header.length < LOCAL_HEADER_FIXED_SIZE || header.readUInt32LE(0) !== SIG_LOCAL_HEADER) {
      throw new Error(`Bad local header for ${entry.fileName}`)
    }

    const nameLength = header.readUInt16LE(26)
    const extraLength = header.readUInt16LE(28)
    const dataStart = entry.localHeaderOffset + LOCAL_HEADER_FIXED_SIZE + nameLength + extraLength

    const raw = await this.source.read(dataStart, entry.compressedSize)

    switch (entry.compressionMethod) {
      case METHOD_STORE:
        return raw
      case METHOD_DEFLATE:
        return (await inflateRawAsync(raw)) as Buffer
      default:
        throw new Error(`Unsupported compression method ${entry.compressionMethod} for ${entry.fileName}`)
    }
  }

  async readText(name: string): Promise<string | null> {
    const entry = this.find(name)
    if (!entry || entry.isDirectory) return null
    try {
      const buffer = await this.read(entry)
      return stripBom(buffer.toString('utf8'))
    } catch {
      return null
    }
  }

  async close(): Promise<void> {
    await this.source.close()
  }
}

export async function withZip<T>(filePath: string, fn: (zip: ZipReader) => Promise<T>): Promise<T> {
  const zip = await ZipReader.open(filePath)
  try {
    return await fn(zip)
  } finally {
    await zip.close()
  }
}

interface CentralDirectoryLocation {
  offset: number
  size: number
}

async function readCentralDirectory(source: ByteSource): Promise<ZipEntry[]> {
  const location = await locateCentralDirectory(source)
  const buffer = await source.read(location.offset, location.size)

  const entries: ZipEntry[] = []
  let cursor = 0

  while (cursor + CENTRAL_HEADER_FIXED_SIZE <= buffer.length) {
    if (buffer.readUInt32LE(cursor) !== SIG_CENTRAL_HEADER) break

    const flags = buffer.readUInt16LE(cursor + 8)
    const compressionMethod = buffer.readUInt16LE(cursor + 10)
    let compressedSize = buffer.readUInt32LE(cursor + 20)
    let uncompressedSize = buffer.readUInt32LE(cursor + 24)
    const nameLength = buffer.readUInt16LE(cursor + 28)
    const extraLength = buffer.readUInt16LE(cursor + 30)
    const commentLength = buffer.readUInt16LE(cursor + 32)
    let localHeaderOffset = buffer.readUInt32LE(cursor + 42)

    const nameStart = cursor + CENTRAL_HEADER_FIXED_SIZE
    const fileName = buffer.subarray(nameStart, nameStart + nameLength).toString('utf8')
    const extra = buffer.subarray(nameStart + nameLength, nameStart + nameLength + extraLength)

    if (compressedSize === U32_MAX || uncompressedSize === U32_MAX || localHeaderOffset === U32_MAX) {
      const patched = applyZip64Extra(extra, { compressedSize, uncompressedSize, localHeaderOffset })
      compressedSize = patched.compressedSize
      uncompressedSize = patched.uncompressedSize
      localHeaderOffset = patched.localHeaderOffset
    }

    entries.push({
      fileName,
      compressedSize,
      uncompressedSize,
      compressionMethod,
      localHeaderOffset,
      flags,
      isDirectory: fileName.endsWith('/')
    })

    cursor = nameStart + nameLength + extraLength + commentLength
  }

  return entries
}

async function locateCentralDirectory(source: ByteSource): Promise<CentralDirectoryLocation> {
  const fileSize = source.size
  const tailLength = Math.min(fileSize, EOCD_FIXED_SIZE + MAX_ZIP_COMMENT)
  const tailStart = fileSize - tailLength
  const tail = await source.read(tailStart, tailLength)

  let eocd = -1
  for (let i = tail.length - EOCD_FIXED_SIZE; i >= 0; i--) {
    if (tail.readUInt32LE(i) !== SIG_EOCD) continue
    const commentLength = tail.readUInt16LE(i + 20)
    if (i + EOCD_FIXED_SIZE + commentLength === tail.length) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error('Not a ZIP archive: no end-of-central-directory record')

  const size = tail.readUInt32LE(eocd + 12)
  const offset = tail.readUInt32LE(eocd + 16)
  const totalEntries = tail.readUInt16LE(eocd + 10)

  const needsZip64 = size === U32_MAX || offset === U32_MAX || totalEntries === 0xffff
  if (!needsZip64) return { offset, size }

  const locator = eocd - 20
  if (locator < 0 || tail.readUInt32LE(locator) !== SIG_EOCD64_LOCATOR) {
    return { offset, size }
  }

  const zip64Offset = Number(tail.readBigUInt64LE(locator + 8))
  const zip64 = await source.read(zip64Offset, 56)
  if (zip64.length < 56 || zip64.readUInt32LE(0) !== SIG_EOCD64) {
    return { offset, size }
  }

  return {
    size: Number(zip64.readBigUInt64LE(40)),
    offset: Number(zip64.readBigUInt64LE(48))
  }
}

interface Zip64Fields {
  compressedSize: number
  uncompressedSize: number
  localHeaderOffset: number
}

function applyZip64Extra(extra: Buffer, fields: Zip64Fields): Zip64Fields {
  const result = { ...fields }
  let cursor = 0

  while (cursor + 4 <= extra.length) {
    const headerId = extra.readUInt16LE(cursor)
    const dataSize = extra.readUInt16LE(cursor + 2)
    const dataStart = cursor + 4
    const dataEnd = dataStart + dataSize

    if (headerId === 0x0001) {
      let p = dataStart
      if (result.uncompressedSize === U32_MAX && p + 8 <= dataEnd) {
        result.uncompressedSize = Number(extra.readBigUInt64LE(p))
        p += 8
      }
      if (result.compressedSize === U32_MAX && p + 8 <= dataEnd) {
        result.compressedSize = Number(extra.readBigUInt64LE(p))
        p += 8
      }
      if (result.localHeaderOffset === U32_MAX && p + 8 <= dataEnd) {
        result.localHeaderOffset = Number(extra.readBigUInt64LE(p))
      }
      break
    }

    cursor = dataEnd
  }

  return result
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}
