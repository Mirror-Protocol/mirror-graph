import { PublicKey } from '@solana/web3.js'
import { sha256 } from 'crypto-hash'
import BN = require('bn.js')

/**
 * Derive a program address from seeds and a program ID.
 */
export class ProgramAddress {
  static async create(seeds: string[], programID: PublicKey): Promise<PublicKey> {
    let buffer = Buffer.alloc(0)
    seeds.forEach((seed) => {
      buffer = Buffer.concat([buffer, Buffer.from(seed)])
    })
    buffer = Buffer.concat([buffer, programID.toBuffer(), Buffer.from('ProgramDerivedAddress')])
    let hash = await sha256(new Uint8Array(buffer))
    hash = await sha256(new Uint8Array(new BN(hash, 16).toBuffer()))
    return new PublicKey('0x' + hash)
  }
}
