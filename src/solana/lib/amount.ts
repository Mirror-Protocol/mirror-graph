import * as assert from 'assert'
import BN = require('bn.js')

/**
 * Some amount
 */
export class Amount extends BN {
  constructor(
    number: number | string | number[] | Uint8Array | Buffer | BN,
    base?: number | 'hex',
    endian?: BN.Endianness
  ) {
    super(number, base, endian)
  }

  /**
   * Convert to Buffer representation
   */
  toBuffer(): Buffer {
    const a = super.toArray().reverse()
    const b = Buffer.from(a)
    if (b.length === 8) {
      return b
    }
    assert(b.length < 8, 'Amount too large')

    const zeroPad = Buffer.alloc(8)
    b.copy(zeroPad)
    return zeroPad
  }

  /**
   * Construct a TokenAmount from Buffer representation
   */
  static fromBuffer(buffer: Buffer): Amount {
    assert(buffer.length === 8, `Invalid buffer length: ${buffer.length}`)
    return new Amount(
      [...buffer]
        .reverse()
        .map((i) => `00${i.toString(16)}`.slice(-2))
        .join(''),
      16
    )
  }
}
