import * as assert from 'assert'

export class SymbolBuffer extends String {
  /**
   * Convert to Buffer representation
   */
  toBuffer(): Buffer {
    const b = Buffer.from(this)
    if (b.length === 8) {
      return b
    }

    assert(b.length < 8, 'Symbol too large')

    const zeroPad = Buffer.alloc(8)
    b.copy(zeroPad)
    return zeroPad
  }

  /**
   * Construct a Denom from Buffer representation
   */
  static fromBuffer(buffer: Buffer): SymbolBuffer {
    assert(buffer.length === 8, `Invalid buffer length: ${buffer.length}`)
    return new SymbolBuffer(buffer.toString().replace(/\0/g, ''))
  }
}
