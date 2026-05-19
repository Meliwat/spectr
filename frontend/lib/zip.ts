import { deflateRawSync } from 'node:zlib'

/**
 * Minimal, dependency-free ZIP writer (DEFLATE, no ZIP64).
 *
 * Good for bundling the per-category spec packs (tens of small markdown
 * files, well under the 4GB/65535-entry limits that would require ZIP64).
 * The codebase keeps a deliberately small dependency set, so this uses only
 * Node's built-in zlib instead of pulling in jszip/archiver.
 */

const CRC_TABLE: number[] = (() => {
  const t: number[] = []
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf: Buffer): number {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

export type ZipEntry = { name: string; data: Buffer }

export function buildZip(entries: ZipEntry[]): Buffer {
  const chunks: Buffer[] = []
  const central: Buffer[] = []
  let offset = 0

  for (const e of entries) {
    const nameBuf = Buffer.from(e.name, 'utf8')
    const crc = crc32(e.data)
    const compressed = deflateRawSync(e.data)
    const uncompSize = e.data.length
    const compSize = compressed.length

    // Local file header
    const lfh = Buffer.alloc(30)
    lfh.writeUInt32LE(0x04034b50, 0)
    lfh.writeUInt16LE(20, 4) // version needed
    lfh.writeUInt16LE(0, 6) // flags
    lfh.writeUInt16LE(8, 8) // method = deflate
    lfh.writeUInt16LE(0, 10) // mod time
    lfh.writeUInt16LE(0x21, 12) // mod date (1980-01-01)
    lfh.writeUInt32LE(crc, 14)
    lfh.writeUInt32LE(compSize, 18)
    lfh.writeUInt32LE(uncompSize, 22)
    lfh.writeUInt16LE(nameBuf.length, 26)
    lfh.writeUInt16LE(0, 28) // extra len
    chunks.push(lfh, nameBuf, compressed)

    // Central directory record
    const cdr = Buffer.alloc(46)
    cdr.writeUInt32LE(0x02014b50, 0)
    cdr.writeUInt16LE(20, 4) // version made by
    cdr.writeUInt16LE(20, 6) // version needed
    cdr.writeUInt16LE(0, 8) // flags
    cdr.writeUInt16LE(8, 10) // method
    cdr.writeUInt16LE(0, 12) // mod time
    cdr.writeUInt16LE(0x21, 14) // mod date
    cdr.writeUInt32LE(crc, 16)
    cdr.writeUInt32LE(compSize, 20)
    cdr.writeUInt32LE(uncompSize, 24)
    cdr.writeUInt16LE(nameBuf.length, 28)
    cdr.writeUInt16LE(0, 30) // extra len
    cdr.writeUInt16LE(0, 32) // comment len
    cdr.writeUInt16LE(0, 34) // disk start
    cdr.writeUInt16LE(0, 36) // internal attrs
    cdr.writeUInt32LE(0, 38) // external attrs
    cdr.writeUInt32LE(offset, 42) // local header offset
    central.push(Buffer.concat([cdr, nameBuf]))

    offset += lfh.length + nameBuf.length + compressed.length
  }

  const centralBuf = Buffer.concat(central)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(0, 4) // disk
  eocd.writeUInt16LE(0, 6) // disk w/ central dir
  eocd.writeUInt16LE(entries.length, 8) // entries this disk
  eocd.writeUInt16LE(entries.length, 10) // total entries
  eocd.writeUInt32LE(centralBuf.length, 12) // central dir size
  eocd.writeUInt32LE(offset, 16) // central dir offset
  eocd.writeUInt16LE(0, 20) // comment len

  return Buffer.concat([...chunks, centralBuf, eocd])
}
