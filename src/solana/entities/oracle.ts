import * as BufferLayout from 'buffer-layout'
import { Account, PublicKey, Connection, Transaction, SystemProgram } from '@solana/web3.js'
import { sendAndConfirmTransaction, AmountBuffer, SymbolBuffer } from '../lib'
import * as Layout from '../lib/layout'

/**
 * Information about a mint config
 */
type OracleInfo = {
  price: AmountBuffer
  decimals: number
  assetToken: PublicKey
  baseToken: PublicKey
  symbol: SymbolBuffer
  owner: PublicKey
}

/**
 * @private
 */
const OracleInfoLayout = BufferLayout.struct([
  Layout.uint64('state'),
  Layout.uint64('price'),
  Layout.uint64('decimals'),
  Layout.publicKey('assetToken'),
  Layout.publicKey('baseToken'),
  Layout.symbol('symbol'),
  Layout.publicKey('owner'),
])

/**
 * Simple Oracle
 */
export class Oracle {
  /**
   * @private
   */
  connection: Connection

  oracle: PublicKey
  owner: Account
  programID: PublicKey

  /**
   * Create a Token object attached to the specific oracle
   *
   * @param connection The connection to use
   * @param oracle Public key
   * @param oracle programID
   */
  constructor(connection: Connection, oracle: PublicKey, owner: Account, programID: PublicKey) {
    Object.assign(this, { connection, oracle, owner, programID })
  }

  /**
   * Get the minimum balance for the oracle to be rent exempt
   *
   * @return Number of lamports required
   */
  static async getMinBalanceRentForExemptOracle(connection: Connection): Promise<number> {
    return await connection.getMinimumBalanceForRentExemption(OracleInfoLayout.span)
  }

  static async createOracle(
    connection: Connection,
    oracleAccount: Account,
    owner: Account,
    assetToken: PublicKey,
    baseToken: PublicKey,
    decimals: number,
    symbol: SymbolBuffer,
    programID: PublicKey
  ): Promise<Oracle> {
    const oracle = new Oracle(connection, oracleAccount.publicKey, owner, programID)

    let transaction: Transaction = null

    const dataLayout = BufferLayout.struct([
      BufferLayout.nu64('instruction'),
      Layout.uint64('decimals'),
      Layout.symbol('symbol'),
    ])

    let data = Buffer.alloc(1024)
    {
      const encodeLength = dataLayout.encode(
        {
          instruction: 0,
          decimals: new AmountBuffer(decimals).toBuffer(),
          symbol: symbol.toBuffer(),
        },
        data
      )
      data = data.slice(0, encodeLength)
    }

    const balanceNeeded = await Oracle.getMinBalanceRentForExemptOracle(connection)

    // Allocate memory for the oracleAccount account
    transaction = SystemProgram.createAccount({
      fromPubkey: owner.publicKey,
      newAccountPubkey: oracleAccount.publicKey,
      lamports: balanceNeeded,
      space: OracleInfoLayout.span,
      programId: programID,
    })

    await sendAndConfirmTransaction('createAccount', connection, transaction, owner, oracleAccount)

    transaction = new Transaction().add({
      keys: [
        { pubkey: owner.publicKey, isSigner: true, isWritable: false },
        { pubkey: assetToken, isSigner: false, isWritable: false },
        { pubkey: baseToken, isSigner: false, isWritable: false },
        { pubkey: oracleAccount.publicKey, isSigner: false, isWritable: true },
      ],
      programId: programID,
      data,
    })

    await sendAndConfirmTransaction('New oracleAccount', connection, transaction, owner)

    return oracle
  }

  async updatePrice(price: AmountBuffer): Promise<void> {
    let transaction: Transaction = null

    const dataLayout = BufferLayout.struct([
      BufferLayout.nu64('instruction'),
      Layout.uint64('price'),
    ])

    let data = Buffer.alloc(1024)
    {
      const encodeLength = dataLayout.encode(
        {
          instruction: 1,
          price: price.toBuffer(),
        },
        data
      )
      data = data.slice(0, encodeLength)
    }

    transaction = new Transaction().add({
      keys: [
        { pubkey: this.owner.publicKey, isSigner: true, isWritable: false },
        { pubkey: this.oracle, isSigner: false, isWritable: true },
      ],
      programId: this.programID,
      data,
    })

    await sendAndConfirmTransaction('Update price', this.connection, transaction, this.owner)

    return
  }

  /**
   * Retrieve oracle information
   */
  async oracleInfo(): Promise<OracleInfo> {
    const accountInfo = await this.connection.getAccountInfo(this.oracle)
    if (accountInfo == null) {
      throw new Error('failed to retrieve oracle info')
    }

    if (!accountInfo.owner.equals(this.programID)) {
      throw new Error(`Invalid oracle owner: ${JSON.stringify(accountInfo.owner)}`)
    }

    const data = Buffer.from(accountInfo.data)
    const oracleInfo = OracleInfoLayout.decode(data)
    oracleInfo.state = Number(oracleInfo.state[0])
    if (oracleInfo.state !== 1) {
      throw new Error('Invalid oracle account data')
    }

    oracleInfo.symbol = SymbolBuffer.fromBuffer(oracleInfo.symbol)
    oracleInfo.decimals = AmountBuffer.fromBuffer(oracleInfo.decimals).toNumber()
    oracleInfo.price = AmountBuffer.fromBuffer(oracleInfo.price)
    return oracleInfo
  }
}
