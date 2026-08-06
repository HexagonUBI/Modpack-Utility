import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SIZE = 512
const SAMPLES = 3
const CORNER_RADIUS = 96

const COLOURS = {
  background: [0x16, 0x21, 0x1b],
  top: [0x9f, 0xc2, 0xad],
  left: [0x5d, 0x7f, 0x6c],
  right: [0x41, 0x60, 0x4f]
}

const CX = 256
const TOP_Y = 128
const HALF_WIDTH = 120
const TOP_HALF_HEIGHT = 68
const SIDE_HEIGHT = 130

const A = [CX, TOP_Y]
const B = [CX + HALF_WIDTH, TOP_Y + TOP_HALF_HEIGHT]
const C = [CX, TOP_Y + TOP_HALF_HEIGHT * 2]
const D = [CX - HALF_WIDTH, TOP_Y + TOP_HALF_HEIGHT]
const B2 = [B[0], B[1] + SIDE_HEIGHT]
const C2 = [C[0], C[1] + SIDE_HEIGHT]
const D2 = [D[0], D[1] + SIDE_HEIGHT]

const FACES = [
  { points: [A, B, C, D], colour: COLOURS.top },
  { points: [D, C, C2, D2], colour: COLOURS.left },
  { points: [C, B, B2, C2], colour: COLOURS.right }
]

function insideRoundedSquare(x, y) {
  const r = CORNER_RADIUS
  if (x < 0 || y < 0 || x > SIZE || y > SIZE) return false

  const cx = x < r ? r : x > SIZE - r ? SIZE - r : x
  const cy = y < r ? r : y > SIZE - r ? SIZE - r : y
  if (cx === x || cy === y) return true

  const dx = x - cx
  const dy = y - cy
  return dx * dx + dy * dy <= r * r
}

function insidePolygon(points, x, y) {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i]
    const [xj, yj] = points[j]
    const straddles = yi > y !== yj > y
    if (straddles && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function sample(x, y) {
  if (!insideRoundedSquare(x, y)) return null
  for (const face of FACES) {
    if (insidePolygon(face.points, x, y)) return face.colour
  }
  return COLOURS.background
}

function renderPixels() {
  const pixels = Buffer.alloc(SIZE * SIZE * 4)
  const step = 1 / SAMPLES
  const total = SAMPLES * SAMPLES

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let r = 0
      let g = 0
      let b = 0
      let covered = 0

      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const colour = sample(x + (sx + 0.5) * step, y + (sy + 0.5) * step)
          if (!colour) continue
          r += colour[0]
          g += colour[1]
          b += colour[2]
          covered++
        }
      }

      const offset = (y * SIZE + x) * 4
      if (covered === 0) continue

      pixels[offset] = Math.round(r / covered)
      pixels[offset + 1] = Math.round(g / covered)
      pixels[offset + 2] = Math.round(b / covered)
      pixels[offset + 3] = Math.round((covered / total) * 255)
    }
  }

  return pixels
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buffer) {
  let c = 0xffffffff
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

function encodePng(pixels) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(SIZE, 0)
  header.writeUInt32BE(SIZE, 4)
  header[8] = 8
  header[9] = 6
  header[10] = 0
  header[11] = 0
  header[12] = 0

  const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1))
  for (let y = 0; y < SIZE; y++) {
    const target = y * (SIZE * 4 + 1)
    raw[target] = 0
    pixels.copy(raw, target + 1, y * SIZE * 4, (y + 1) * SIZE * 4)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const target = join(root, 'build', 'icon.png')

mkdirSync(dirname(target), { recursive: true })
writeFileSync(target, encodePng(renderPixels()))
console.log(`wrote ${target} (${SIZE}x${SIZE})`)
