import * as BufferLayout from 'buffer-layout'
import { Account, PublicKey, Connection, Transaction, SystemProgram } from '@solana/web3.js'
import { sendTransaction, Amount, SymbolBuffer, ProgramAddress } from '../lib'
import * as Layout from '../lib/transform/layout'
import { Token } from './token'

/**
 * Information about a mint config
 */
type ConfigInfo = {
  owner: Account
  decimals: number
  mintCapacity: Amount
  whitelistThreshold: Amount
  collateralToken: PublicKey
  depositToken: PublicKey
}

/**
 * @private
 */
const ConfigInfoLayout = BufferLayout.struct([
  Layout.uint64('state'),
  Layout.publicKey('owner'),
  Layout.uint64('decimals'),
  Layout.uint64('mintCapacity'),
  Layout.uint64('whitelistThreshold'),
  Layout.publicKey('collateralToken'),
  Layout.publicKey('depositToken'),
])

/**
 * Information about a mint board
 */
type BoardInfo = {
  symbol: SymbolBuffer
  config: PublicKey
  assetToken: PublicKey
  assetHolder: PublicKey
  depositHolder: PublicKey
  collateralHolder: PublicKey
  oracle: PublicKey
  isMintable: boolean
  totalDepositAmount: Amount
  totalMintAmount: Amount
  totalCollateralAmount: Amount
}

/**
 * @private
 */
const BoardInfoLayout = BufferLayout.struct([
  Layout.uint64('state'),
  Layout.symbol('symbol'),
  Layout.publicKey('config'),
  Layout.publicKey('assetToken'),
  Layout.publicKey('assetHolder'),
  Layout.publicKey('depositHolder'),
  Layout.publicKey('collateralHolder'),
  Layout.publicKey('oracle'),
  Layout.uint64('isMintable'),
  Layout.uint64('totalDepositAmount'),
  Layout.uint64('totalMintAmount'),
  Layout.uint64('totalCollateralAmount'),
])

/**
 * Information about a mint deposit
 */
type DepositInfo = {
  owner: PublicKey
  mintBoard: PublicKey
  depositAmount: Amount
}

/**
 * @private
 */
const DepositInfoLayout = BufferLayout.struct([
  Layout.uint64('state'),
  Layout.publicKey('owner'),
  Layout.publicKey('mintBoard'),
  Layout.uint64('depositAmount'),
])

const BOARD_PREFIX = 'board'

// const TOKEN_DECIMAL: number = 9
// const TOKEN_SUPPLY = new Amount(10_000_000_000).muln(Math.pow(10, TOKEN_DECIMAL))

/**
 * Minter manage whitelist and asset's supply
 */
export class Minter {
  /**
   * @private
   */
  connection: Connection
  programID: PublicKey

  owner: Account
  config: PublicKey
  collateralTokenProgramID: PublicKey
  collateralToken: PublicKey
  depositTokenProgramID: PublicKey
  depositToken: PublicKey
  mintDataSize: number
  boards: { string: PublicKey }

  /**
   *
   * @param connection The connection to use
   * @param collateralTokenProgramID Collateral token program ID
   * @param collateralToken Collateral token public key
   * @param depositTokenProgramID Deposit token program ID
   * @param depositToken Deposit token public key
   */
  constructor(
    connection: Connection,
    programID: PublicKey,
    owner: Account,
    config: PublicKey,
    collateralTokenProgramID: PublicKey,
    collateralToken: PublicKey,
    depositTokenProgramID: PublicKey,
    depositToken: PublicKey
  ) {
    Object.assign(this, {
      connection,
      programID,
      owner,
      config,
      collateralTokenProgramID,
      collateralToken,
      depositTokenProgramID,
      depositToken,
      boards: {},
    })
  }

  /**
   * Get the minimum balance for the config to be rent exempt
   *
   * @return Number of lamports required
   */
  static async getMinBalanceRentForExemptMinter(connection: Connection): Promise<number> {
    return await connection.getMinimumBalanceForRentExemption(this.getMinterDataSize())
  }

  static getMinterDataSize(): number {
    return Math.max(ConfigInfoLayout.span, BoardInfoLayout.span) + 10
  }

  static async createMinter(
    connection: Connection,
    owner: Account,
    collateralTokenProgramID: PublicKey,
    collateralToken: PublicKey,
    depositTokenProgramID: PublicKey,
    depositToken: PublicKey,
    decimals: number,
    mintCapacity: Amount,
    whitelistThreshold: Amount,
    programID: PublicKey
  ): Promise<Minter> {
    const configAccount = new Account()
    const minter = new Minter(
      connection,
      programID,
      owner,
      configAccount.publicKey,
      collateralTokenProgramID,
      collateralToken,
      depositTokenProgramID,
      depositToken
    )

    let transaction: Transaction = null

    const balanceNeeded = await Minter.getMinBalanceRentForExemptMinter(connection)

    // Allocate memory for the oracleAccount account
    transaction = SystemProgram.createAccount({
      fromPubkey: owner.publicKey,
      newAccountPubkey: configAccount.publicKey,
      lamports: balanceNeeded,
      space: this.getMinterDataSize(),
      programId: programID,
    })

    await sendTransaction(connection, transaction, owner, configAccount)

    const dataLayout = BufferLayout.struct([
      BufferLayout.nu64('instruction'),
      Layout.uint64('decimals'),
      Layout.uint64('mintCapacity'),
      Layout.uint64('whitelistThreshold'),
    ])

    let data = Buffer.alloc(1024)
    {
      const encodeLength = dataLayout.encode(
        {
          instruction: 0,
          decimals: new Amount(decimals).toBuffer(),
          mintCapacity: mintCapacity.toBuffer(),
          whitelistThreshold: whitelistThreshold.toBuffer(),
        },
        data
      )
      data = data.slice(0, encodeLength)
    }

    transaction = new Transaction().add({
      keys: [
        { pubkey: owner.publicKey, isSigner: true, isWritable: false },
        { pubkey: collateralToken, isSigner: false, isWritable: false },
        { pubkey: depositToken, isSigner: false, isWritable: false },
        { pubkey: configAccount.publicKey, isSigner: false, isWritable: true },
      ],
      programId: programID,
      data,
    })

    await sendTransaction(connection, transaction, owner)

    return minter
  }

  async createBoard(
    assetTokenProgramID: PublicKey,
    oracle: PublicKey,
    symbol: SymbolBuffer
  ): Promise<[PublicKey, Token]> {
    const boardAccount = new Account()
    this.boards[symbol.toString()] = boardAccount.publicKey

    const boardSigner = await ProgramAddress.create(
      [BOARD_PREFIX, symbol.toString()],
      this.programID
    )
    const [assetToken, tokenAccount] = await Token.fundsToken(
      this.connection,
      this.owner,
      assetTokenProgramID
    )
    const assetBoard = await Token.createNewAccount(
      this.connection,
      this.owner,
      boardSigner,
      assetToken.token,
      assetTokenProgramID
    )
    const collateralBoard = await Token.createNewAccount(
      this.connection,
      this.owner,
      boardSigner,
      this.collateralToken,
      this.collateralTokenProgramID
    )
    const depositBoard = await Token.createNewAccount(
      this.connection,
      this.owner,
      boardSigner,
      this.depositToken,
      this.depositTokenProgramID
    )

    const balanceNeeded = await Minter.getMinBalanceRentForExemptMinter(this.connection)

    let transaction: Transaction = SystemProgram.createAccount({
      fromPubkey: this.owner.publicKey,
      newAccountPubkey: boardAccount.publicKey,
      lamports: balanceNeeded,
      space: Minter.getMinterDataSize(),
      programId: this.programID,
    })

    await sendTransaction(this.connection, transaction, this.owner, boardAccount)

    const dataLayout = BufferLayout.struct([
      BufferLayout.nu64('instruction'),
      Layout.symbol('symbol'),
    ])

    let data = Buffer.alloc(1024)
    {
      const encodeLength = dataLayout.encode(
        {
          instruction: 3,
          symbol: symbol.toBuffer(),
        },
        data
      )
      data = data.slice(0, encodeLength)
    }

    transaction = new Transaction().add({
      keys: [
        { pubkey: this.owner.publicKey, isSigner: true, isWritable: false },
        { pubkey: assetTokenProgramID, isSigner: false, isWritable: false },
        { pubkey: assetToken.token, isSigner: true, isWritable: true },
        { pubkey: assetBoard, isSigner: false, isWritable: true },
        { pubkey: this.collateralTokenProgramID, isSigner: false, isWritable: false },
        { pubkey: this.collateralToken, isSigner: false, isWritable: false },
        { pubkey: collateralBoard, isSigner: false, isWritable: false },
        { pubkey: this.depositTokenProgramID, isSigner: false, isWritable: false },
        { pubkey: this.depositToken, isSigner: false, isWritable: false },
        { pubkey: depositBoard, isSigner: false, isWritable: false },
        { pubkey: oracle, isSigner: false, isWritable: false },
        { pubkey: this.config, isSigner: false, isWritable: false },
        { pubkey: boardAccount.publicKey, isSigner: false, isWritable: true },
        { pubkey: boardSigner, isSigner: false, isWritable: true },
      ],
      programId: this.programID,
      data,
    })

    await sendTransaction(this.connection, transaction, this.owner, tokenAccount)

    return [boardAccount.publicKey, assetToken]
  }

  async deposit(
    depositOwner: Account,
    depositAcc: PublicKey | void,
    depositTokenOwner: Account,
    depositTokenSource: PublicKey,
    symbol: SymbolBuffer,
    amount: Amount
  ): Promise<PublicKey> {
    const board: PublicKey = this.boards[symbol.toString()]
    const boardInfo: BoardInfo = await this.boardInfo(symbol)

    // Create new deposit account
    if (!depositAcc) {
      const depositAccount = new Account()
      const balanceNeeded: number = await Minter.getMinBalanceRentForExemptMinter(this.connection)

      const transaction: Transaction = SystemProgram.createAccount({
        fromPubkey: depositOwner.publicKey,
        newAccountPubkey: depositAccount.publicKey,
        lamports: balanceNeeded,
        space: Minter.getMinterDataSize(),
        programId: this.programID,
      })

      await sendTransaction(this.connection, transaction, depositOwner, depositAccount)

      depositAcc = depositAccount.publicKey
    }

    const dataLayout = BufferLayout.struct([
      BufferLayout.nu64('instruction'),
      Layout.uint64('depositAmount'),
    ])

    let data = Buffer.alloc(1024)
    {
      const encodeLength = dataLayout.encode(
        {
          instruction: 4,
          depositAmount: amount.toBuffer(),
        },
        data
      )
      data = data.slice(0, encodeLength)
    }

    const transaction = new Transaction().add({
      keys: [
        { pubkey: depositOwner.publicKey, isSigner: true, isWritable: false },
        { pubkey: this.depositTokenProgramID, isSigner: false, isWritable: false },
        { pubkey: depositTokenOwner.publicKey, isSigner: true, isWritable: false },
        { pubkey: depositTokenSource, isSigner: false, isWritable: true },
        { pubkey: boardInfo.depositHolder, isSigner: false, isWritable: true },
        { pubkey: this.config, isSigner: false, isWritable: false },
        { pubkey: board, isSigner: false, isWritable: true },
        { pubkey: depositAcc, isSigner: false, isWritable: true },
      ],
      programId: this.programID,
      data,
    })

    await sendTransaction(this.connection, transaction, depositOwner, depositTokenOwner)

    return depositAcc
  }

  async withdraw(
    depositOwner: Account,
    depositAcc: PublicKey,
    tokenDest: PublicKey,
    symbol: SymbolBuffer,
    amount: Amount
  ): Promise<PublicKey> {
    const board: PublicKey = this.boards[symbol.toString()]
    const boardInfo: BoardInfo = await this.boardInfo(symbol)
    const boardSigner = await ProgramAddress.create(
      [BOARD_PREFIX, symbol.toString()],
      this.programID
    )

    const dataLayout = BufferLayout.struct([
      BufferLayout.nu64('instruction'),
      Layout.uint64('withdrawAmount'),
    ])

    let data = Buffer.alloc(1024)
    {
      const encodeLength = dataLayout.encode(
        {
          instruction: 5,
          withdrawAmount: amount.toBuffer(),
        },
        data
      )
      data = data.slice(0, encodeLength)
    }

    const transaction = new Transaction().add({
      keys: [
        { pubkey: depositOwner.publicKey, isSigner: true, isWritable: false },
        { pubkey: this.depositTokenProgramID, isSigner: false, isWritable: false },
        { pubkey: tokenDest, isSigner: false, isWritable: true },
        { pubkey: boardInfo.depositHolder, isSigner: false, isWritable: true },
        { pubkey: this.config, isSigner: false, isWritable: false },
        { pubkey: board, isSigner: false, isWritable: true },
        { pubkey: depositAcc, isSigner: false, isWritable: true },
        { pubkey: boardSigner, isSigner: false, isWritable: false },
      ],
      programId: this.programID,
      data,
    })

    await sendTransaction(this.connection, transaction, depositOwner)

    return depositAcc
  }

  async mint(
    positionOwner: Account,
    positionAcc: PublicKey | void,
    collateralTokenOwner: Account,
    collateralTokenSource: PublicKey,
    assetTokenProgramID: PublicKey,
    assetTokenDest: PublicKey,
    symbol: SymbolBuffer,
    amount: Amount
  ): Promise<PublicKey> {
    const board: PublicKey = this.boards[symbol.toString()]
    const boardInfo: BoardInfo = await this.boardInfo(symbol)
    const boardSigner = await ProgramAddress.create(
      [BOARD_PREFIX, symbol.toString()],
      this.programID
    )

    // Create new deposit account
    if (!positionAcc) {
      const positionAccount = new Account()
      const balanceNeeded: number = await Minter.getMinBalanceRentForExemptMinter(this.connection)

      const transaction: Transaction = SystemProgram.createAccount({
        fromPubkey: positionOwner.publicKey,
        newAccountPubkey: positionAccount.publicKey,
        lamports: balanceNeeded,
        space: Minter.getMinterDataSize(),
        programId: this.programID,
      })

      await sendTransaction(this.connection, transaction, positionOwner, positionAccount)

      positionAcc = positionAccount.publicKey
    }

    const dataLayout = BufferLayout.struct([
      BufferLayout.nu64('instruction'),
      Layout.uint64('collateralAmount'),
    ])

    let data = Buffer.alloc(1024)
    {
      const encodeLength = dataLayout.encode(
        {
          instruction: 6,
          collateralAmount: amount.toBuffer(),
        },
        data
      )
      data = data.slice(0, encodeLength)
    }

    const transaction = new Transaction().add({
      keys: [
        { pubkey: positionOwner.publicKey, isSigner: true, isWritable: false },
        { pubkey: this.collateralTokenProgramID, isSigner: false, isWritable: false },
        { pubkey: collateralTokenOwner.publicKey, isSigner: true, isWritable: false },
        { pubkey: collateralTokenSource, isSigner: false, isWritable: true },
        { pubkey: boardInfo.collateralHolder, isSigner: false, isWritable: true },
        { pubkey: assetTokenProgramID, isSigner: false, isWritable: false },
        { pubkey: assetTokenDest, isSigner: false, isWritable: true },
        { pubkey: boardInfo.assetHolder, isSigner: false, isWritable: true },
        { pubkey: boardInfo.oracle, isSigner: false, isWritable: false },
        { pubkey: this.config, isSigner: false, isWritable: false },
        { pubkey: board, isSigner: false, isWritable: true },
        { pubkey: positionAcc, isSigner: false, isWritable: true },
        { pubkey: boardSigner, isSigner: false, isWritable: false },
      ],
      programId: this.programID,
      data,
    })

    await sendTransaction(this.connection, transaction, positionOwner, collateralTokenOwner)

    return positionAcc
  }

  /**
   * Retrieve config information
   */
  async configInfo(): Promise<ConfigInfo> {
    const accountInfo = await this.connection.getAccountInfo(this.config)
    if (accountInfo == null) {
      throw new Error('failed to retrieve config info')
    }

    if (!accountInfo.owner.equals(this.programID)) {
      throw new Error(`Invalid config owner: ${JSON.stringify(accountInfo.owner)}`)
    }

    const data = Buffer.from(accountInfo.data)
    const configInfo = ConfigInfoLayout.decode(data)
    configInfo.state = Number(configInfo.state[0])
    if (configInfo.state !== 1) {
      throw new Error('Invalid config account data')
    }

    configInfo.decimals = Amount.fromBuffer(configInfo.decimals).toNumber()
    configInfo.mintCapacity = Amount.fromBuffer(configInfo.mintCapacity)
    configInfo.whitelistThreshold = Amount.fromBuffer(configInfo.whitelistThreshold)
    configInfo.collateralToken = new PublicKey(configInfo.collateralToken)
    configInfo.depositToken = new PublicKey(configInfo.depositToken)
    return configInfo
  }

  /**
   * Retrieve board information
   */
  async boardInfo(symbol: SymbolBuffer): Promise<BoardInfo> {
    const accountInfo = await this.connection.getAccountInfo(this.boards[symbol.toString()])
    if (accountInfo == null) {
      throw new Error('failed to retrieve config info')
    }

    if (!accountInfo.owner.equals(this.programID)) {
      throw new Error(`Invalid board owner: ${JSON.stringify(accountInfo.owner)}`)
    }

    const data = Buffer.from(accountInfo.data)
    const boardInfo = BoardInfoLayout.decode(data)
    boardInfo.state = Number(boardInfo.state[0])
    if (boardInfo.state !== 2) {
      throw new Error('Invalid board account data')
    }

    boardInfo.symbol = SymbolBuffer.fromBuffer(boardInfo.symbol)
    boardInfo.isMintable = boardInfo.isMintable[0] != 0
    boardInfo.totalDepositAmount = Amount.fromBuffer(boardInfo.totalDepositAmount)
    boardInfo.totalCollateralAmount = Amount.fromBuffer(boardInfo.totalCollateralAmount)
    boardInfo.totalMintAmount = Amount.fromBuffer(boardInfo.totalMintAmount)
    boardInfo.depositHolder = new PublicKey(boardInfo.depositHolder)
    boardInfo.collateralHolder = new PublicKey(boardInfo.collateralHolder)
    boardInfo.assetHolder = new PublicKey(boardInfo.assetHolder)
    boardInfo.assetToken = new PublicKey(boardInfo.assetToken)
    boardInfo.oracle = new PublicKey(boardInfo.oracle)

    return boardInfo
  }

  /**
   * Retrieve deposit information
   */
  async depositInfo(depositAccount: PublicKey): Promise<DepositInfo> {
    const accountInfo = await this.connection.getAccountInfo(depositAccount)
    if (accountInfo == null) {
      throw new Error('failed to retrieve config info')
    }

    if (!accountInfo.owner.equals(this.programID)) {
      throw new Error(`Invalid board owner: ${JSON.stringify(accountInfo.owner)}`)
    }

    const data = Buffer.from(accountInfo.data)
    const depositInfo = DepositInfoLayout.decode(data)
    depositInfo.state = Number(depositInfo.state[0])
    if (depositInfo.state !== 3) {
      throw new Error('Invalid deposit account data')
    }

    depositInfo.owner = new PublicKey(depositInfo.owner)
    depositInfo.mintBoard = new PublicKey(depositInfo.mintBoard)
    depositInfo.depositAmount = Amount.fromBuffer(depositInfo.depositAmount)

    return depositInfo
  }
}
