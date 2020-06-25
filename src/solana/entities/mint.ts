import * as BufferLayout from 'buffer-layout'
import { Account, PublicKey, Connection, Transaction, SystemProgram } from '@solana/web3.js'
import { sendTransaction, Amount, SymbolBuffer, ProgramAddress, Token } from 'solana'
import * as Layout from 'solana/types/layout'

/**
 * Information about a mint config
 */
export type ConfigInfo = {
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
export type BoardInfo = {
  symbol: SymbolBuffer
  config: PublicKey
  assetToken: PublicKey
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
export type DepositInfo = {
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

/**
 * Minter manage whitelist and asset's supply
 */
export class Minter {
  /**
   * @private
   */
  connection: Connection
  programId: PublicKey

  owner: Account
  config: PublicKey
  collateralTokenProgramId: PublicKey
  collateralToken: PublicKey
  depositTokenProgramId: PublicKey
  depositToken: PublicKey
  mintDataSize: number

  /**
   *
   * @param connection The connection to use
   * @param collateralTokenProgramId Collateral token program ID
   * @param collateralToken Collateral token public key
   * @param depositTokenProgramId Deposit token program ID
   * @param depositToken Deposit token public key
   */
  constructor(
    connection: Connection,
    programId: PublicKey,
    owner: Account,
    config: PublicKey,
    collateralTokenProgramId: PublicKey,
    collateralToken: PublicKey,
    depositTokenProgramId: PublicKey,
    depositToken: PublicKey
  ) {
    Object.assign(this, {
      connection,
      programId,
      owner,
      config,
      collateralTokenProgramId,
      collateralToken,
      depositTokenProgramId,
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
    return connection.getMinimumBalanceForRentExemption(this.getMinterDataSize())
  }

  static getMinterDataSize(): number {
    return Math.max(ConfigInfoLayout.span, BoardInfoLayout.span, DepositInfoLayout.span) + 10
  }

  static async createMinter(
    connection: Connection,
    owner: Account,
    collateralTokenProgramId: PublicKey,
    collateralToken: PublicKey,
    depositTokenProgramId: PublicKey,
    depositToken: PublicKey,
    decimals: number,
    mintCapacity: Amount,
    whitelistThreshold: Amount,
    programId: PublicKey
  ): Promise<Minter> {
    const configAccount = new Account()
    const minter = new Minter(
      connection,
      programId,
      owner,
      configAccount.publicKey,
      collateralTokenProgramId,
      collateralToken,
      depositTokenProgramId,
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
      programId,
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
      programId,
      data,
    })

    await sendTransaction(connection, transaction, owner)

    return minter
  }

  async createBoard(
    assetTokenProgramId: PublicKey,
    oracle: PublicKey,
    symbol: SymbolBuffer
  ): Promise<[PublicKey, Token]> {
    const boardAccount = new Account()

    const boardSigner = await ProgramAddress.create(
      [BOARD_PREFIX, symbol.toString()],
      this.programId
    )
    const [assetToken, tokenAccount] = await Token.fundsToken(
      this.connection,
      this.owner,
      assetTokenProgramId
    )
    const collateralBoard = await Token.createNewAccount(
      this.connection,
      this.owner,
      boardSigner,
      this.collateralToken,
      this.collateralTokenProgramId
    )
    const depositBoard = await Token.createNewAccount(
      this.connection,
      this.owner,
      boardSigner,
      this.depositToken,
      this.depositTokenProgramId
    )

    const balanceNeeded = await Minter.getMinBalanceRentForExemptMinter(this.connection)

    let transaction: Transaction = SystemProgram.createAccount({
      fromPubkey: this.owner.publicKey,
      newAccountPubkey: boardAccount.publicKey,
      lamports: balanceNeeded,
      space: Minter.getMinterDataSize(),
      programId: this.programId,
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
        { pubkey: assetTokenProgramId, isSigner: false, isWritable: false },
        { pubkey: assetToken.token, isSigner: true, isWritable: true },
        { pubkey: this.collateralTokenProgramId, isSigner: false, isWritable: false },
        { pubkey: this.collateralToken, isSigner: false, isWritable: false },
        { pubkey: collateralBoard, isSigner: false, isWritable: false },
        { pubkey: this.depositTokenProgramId, isSigner: false, isWritable: false },
        { pubkey: this.depositToken, isSigner: false, isWritable: false },
        { pubkey: depositBoard, isSigner: false, isWritable: false },
        { pubkey: oracle, isSigner: false, isWritable: false },
        { pubkey: this.config, isSigner: false, isWritable: false },
        { pubkey: boardAccount.publicKey, isSigner: false, isWritable: true },
        { pubkey: boardSigner, isSigner: false, isWritable: true },
      ],
      programId: this.programId,
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
    boardKey: PublicKey,
    amount: Amount
  ): Promise<PublicKey> {
    const boardInfo: BoardInfo = await this.boardInfo(boardKey)

    // Create new deposit account
    if (!depositAcc) {
      const depositAccount = new Account()
      const balanceNeeded: number = await Minter.getMinBalanceRentForExemptMinter(this.connection)

      const transaction: Transaction = SystemProgram.createAccount({
        fromPubkey: depositOwner.publicKey,
        newAccountPubkey: depositAccount.publicKey,
        lamports: balanceNeeded,
        space: Minter.getMinterDataSize(),
        programId: this.programId,
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
        { pubkey: this.depositTokenProgramId, isSigner: false, isWritable: false },
        { pubkey: depositTokenOwner.publicKey, isSigner: true, isWritable: false },
        { pubkey: depositTokenSource, isSigner: false, isWritable: true },
        { pubkey: boardInfo.depositHolder, isSigner: false, isWritable: true },
        { pubkey: this.config, isSigner: false, isWritable: false },
        { pubkey: boardKey, isSigner: false, isWritable: true },
        { pubkey: depositAcc, isSigner: false, isWritable: true },
      ],
      programId: this.programId,
      data,
    })

    await sendTransaction(this.connection, transaction, depositOwner, depositTokenOwner)

    return depositAcc
  }

  async withdraw(
    depositOwner: Account,
    depositAcc: PublicKey,
    tokenDest: PublicKey,
    boardKey: PublicKey,
    amount: Amount
  ): Promise<PublicKey> {
    const boardInfo: BoardInfo = await this.boardInfo(boardKey)
    const boardSigner = await ProgramAddress.create(
      [BOARD_PREFIX, boardInfo.symbol.toString()],
      this.programId
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
        { pubkey: this.depositTokenProgramId, isSigner: false, isWritable: false },
        { pubkey: tokenDest, isSigner: false, isWritable: true },
        { pubkey: boardInfo.depositHolder, isSigner: false, isWritable: true },
        { pubkey: this.config, isSigner: false, isWritable: false },
        { pubkey: boardKey, isSigner: false, isWritable: true },
        { pubkey: depositAcc, isSigner: false, isWritable: true },
        { pubkey: boardSigner, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
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
    assetTokenProgramId: PublicKey,
    assetTokenDest: PublicKey,
    boardKey: PublicKey,
    amount: Amount
  ): Promise<PublicKey> {
    const boardInfo: BoardInfo = await this.boardInfo(boardKey)
    const boardSigner = await ProgramAddress.create(
      [BOARD_PREFIX, boardInfo.symbol.toString()],
      this.programId
    )

    // Create new position account
    if (!positionAcc) {
      const positionAccount = new Account()
      const balanceNeeded: number = await Minter.getMinBalanceRentForExemptMinter(this.connection)

      const transaction: Transaction = SystemProgram.createAccount({
        fromPubkey: positionOwner.publicKey,
        newAccountPubkey: positionAccount.publicKey,
        lamports: balanceNeeded,
        space: Minter.getMinterDataSize(),
        programId: this.programId,
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
        { pubkey: this.collateralTokenProgramId, isSigner: false, isWritable: false },
        { pubkey: collateralTokenOwner.publicKey, isSigner: true, isWritable: false },
        { pubkey: collateralTokenSource, isSigner: false, isWritable: true },
        { pubkey: boardInfo.collateralHolder, isSigner: false, isWritable: true },
        { pubkey: assetTokenProgramId, isSigner: false, isWritable: false },
        { pubkey: boardInfo.assetToken, isSigner: false, isWritable: true },
        { pubkey: assetTokenDest, isSigner: false, isWritable: true },
        { pubkey: boardInfo.oracle, isSigner: false, isWritable: false },
        { pubkey: this.config, isSigner: false, isWritable: false },
        { pubkey: boardKey, isSigner: false, isWritable: true },
        { pubkey: positionAcc, isSigner: false, isWritable: true },
        { pubkey: boardSigner, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
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

    if (!accountInfo.owner.equals(this.programId)) {
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
  async boardInfo(boardKey: PublicKey): Promise<BoardInfo> {
    const accountInfo = await this.connection.getAccountInfo(boardKey)
    if (accountInfo == null) {
      throw new Error('failed to retrieve config info')
    }

    if (!accountInfo.owner.equals(this.programId)) {
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

    if (!accountInfo.owner.equals(this.programId)) {
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
