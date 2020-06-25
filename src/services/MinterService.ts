import { Service, Inject } from 'typedi'
import { Account, PublicKey } from '@solana/web3.js'
import {
  createOracle,
  createDeposit,
  createTokenAccount,
  createMintPosition,
  Amount,
  SymbolBuffer,
  Minter,
  Token,
  Oracle,
  getConnection,
  DECIMALS,
  BoardInfo,
} from 'solana'
import { Asset } from 'orm'
import { ProgramService, AssetService } from 'services'
import * as logger from 'lib/logger'
import { decryptBuffer } from 'lib/crypto'

@Service()
export class MinterService {
  private minter: Minter
  private depositToken: Token
  private collateralToken: Token

  constructor(
    @Inject((type) => ProgramService) private readonly programService: ProgramService,
    @Inject((type) => AssetService) private readonly assetService: AssetService
  ) {}

  async load(): Promise<Minter> {
    const { programIds, minter, depositToken, collateralToken } = await this.programService.get()

    this.minter = new Minter(
      await getConnection(),
      new PublicKey(programIds.mint),
      new Account(decryptBuffer(minter.ownerSecretKey)),
      new PublicKey(minter.key),
      new PublicKey(programIds.token),
      new PublicKey(collateralToken.key),
      new PublicKey(programIds.token),
      new PublicKey(depositToken.key)
    )

    this.depositToken = new Token(
      await getConnection(),
      new PublicKey(depositToken.key),
      new Account(decryptBuffer(depositToken.ownerSecretKey)),
      new PublicKey(programIds.token)
    )

    this.collateralToken = new Token(
      await getConnection(),
      new PublicKey(collateralToken.key),
      new Account(decryptBuffer(collateralToken.ownerSecretKey)),
      new PublicKey(programIds.token)
    )

    return this.minter
  }

  async get(): Promise<Minter> {
    return this.minter || (await this.load())
  }

  async getBoard(symbol: string): Promise<BoardInfo> {
    const minter: Minter = await this.get()
    const asset: Asset = await this.assetService.get(symbol)

    return minter.boardInfo(new PublicKey(asset.boardKey))
  }

  async whitelisting(symbol: string): Promise<Asset> {
    const minter: Minter = await this.get()
    const configInfo = await minter.configInfo()
    const program = await this.programService.get()
    const { programIds, collateralToken } = program

    logger.info(`whitelisting ${symbol} token`)

    const oracleAccount = new Account()
    const symbolBuffer = new SymbolBuffer(symbol)

    // create asset board and assetToken
    const [boardKey, assetToken] = await minter.createBoard(
      new PublicKey(programIds.token),
      oracleAccount.publicKey,
      symbolBuffer
    )

    // create oracle
    const [oracle] = await createOracle(
      oracleAccount,
      assetToken.token,
      new PublicKey(collateralToken.key),
      DECIMALS,
      symbolBuffer,
      new PublicKey(programIds.oracle)
    )

    // todo: remove test code
    const oraclePrice = new Amount(1000 * Math.pow(10, DECIMALS))
    await oracle.updatePrice(oraclePrice)

    const boardInfo = await minter.boardInfo(boardKey)
    logger.info('Mint Board:', boardInfo)

    // todo: remove test code
    const [depositerOwner, depositerAccount] = await createTokenAccount(this.depositToken)
    await this.depositToken.mintTo(depositerAccount, new Amount('100000000000000'))

    logger.info('Deposit as much as threshold')
    const [, /*depositOwner*/ depositAccount] = await createDeposit(
      minter,
      depositerOwner,
      depositerAccount,
      boardKey,
      configInfo.whitelistThreshold
    )

    const depositInfo = await minter.depositInfo(depositAccount)
    logger.info('Deposit:', depositInfo)

    return this.assetService.create(symbol, program, assetToken, boardKey, oracle)
  }

  async mint(symbol: string): Promise<void> {
    const minter: Minter = await this.get()
    const asset: Asset = await this.assetService.get(symbol)
    const assetToken: Token = await this.assetService.getAssetToken(symbol)
    const oracle: Oracle = await this.assetService.getOracle(symbol)
    const oracleInfo = await oracle.oracleInfo()
    const configInfo = await minter.configInfo()

    // todo: remove test code
    const [collateralerOwner, collateralerAccount] = await createTokenAccount(this.collateralToken)
    await this.depositToken.mintTo(collateralerAccount, new Amount('100000000000000'))

    // Create asset token receiver
    logger.info('Create Asset Receiver')
    const [, /*assetReceiverOwner*/ assetReceiver] = await createTokenAccount(assetToken)

    logger.info('Create Mint Position')
    const targetMintedAmount = new Amount(10)
    const [positionOwner, positionAccount] = await createMintPosition(
      minter,
      collateralerOwner,
      collateralerAccount,
      assetToken.programId,
      assetReceiver,
      new PublicKey(asset.boardKey),
      new Amount(
        targetMintedAmount
          .mul(oracleInfo.price)
          .divn(Math.pow(10, oracleInfo.decimals))
          .muln(Math.pow(10, configInfo.decimals))
          .div(configInfo.mintCapacity)
          .toString()
      )
    )
    logger.info(
      `positionAccount: ${positionAccount.toBase58()}, positionOwnerSecret: ${positionOwner.secretKey.toString()}`
    )
  }
}
