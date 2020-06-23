import { Repository } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Service, Inject } from 'typedi'
import { Account, PublicKey } from '@solana/web3.js'
import {
  createOracle,
  createDeposit,
  createTokenAccount,
  Amount,
  SymbolBuffer,
  Minter,
  Token,
  getConnection,
  DECIMALS,
} from 'solana'
import { Asset } from 'orm'
import { ProgramService, AssetService } from 'services'
import * as logger from 'lib/logger'
import { encryptBuffer, decryptBuffer } from 'lib/crypto'

@Service()
export class MinterService {
  private minter: Minter
  private depositToken: Token
  private collateralToken: Token

  constructor(
    @Inject((type) => ProgramService) private readonly programService: ProgramService,
    @Inject((type) => AssetService) private readonly assetService: AssetService,
    @InjectRepository(Asset) private readonly assetRepo: Repository<Asset>
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

  async whitelisting(symbol: string): Promise<Asset> {
    const minter = await this.get()
    const program = await this.programService.get()
    const { programIds, collateralToken } = program

    logger.info(`whitelisting ${symbol} token`)

    const oracleAccount = new Account()
    const symbolBuffer = new SymbolBuffer(symbol)

    const [boardAccountKey, assetToken] = await minter.createBoard(
      new PublicKey(programIds.token),
      oracleAccount.publicKey,
      symbolBuffer
    )

    const assetTokenInfo = await assetToken.tokenInfo()
    logger.info('Asset Token: ', assetTokenInfo)

    logger.info('Create Oracle')

    const [oracle, oracleOwner] = await createOracle(
      oracleAccount,
      assetToken.token,
      new PublicKey(collateralToken.key),
      DECIMALS,
      symbolBuffer,
      new PublicKey(programIds.oracle)
    )

    logger.info('Update price')

    const oraclePrice = new Amount(1000 * Math.pow(10, DECIMALS))
    await oracle.updatePrice(oraclePrice)

    const oracleInfo = await oracle.oracleInfo()
    logger.info('Oracle: ', oracleInfo)
    logger.info('Oracle Price: ', oracleInfo.price.toString())

    const boardInfo = await minter.boardInfo(boardAccountKey)
    logger.info('Mint Board:', boardInfo)

    return this.assetRepo.save({
      program,
      symbol,
      assetKey: assetToken.token.toBase58(),
      boardKey: boardAccountKey.toBase58(),
      oracleKey: oracleAccount.publicKey.toBase58(),
      oracleOwnerSecretKey: encryptBuffer(oracleOwner.secretKey),
    })
  }

  async deposit(symbol: string): Promise<void> {
    const minter = await this.get()
    const configInfo = await minter.configInfo()
    // const { programIds, collateralToken, depositToken } = await this.programService.get()

    const asset = await this.assetService.get(symbol)

    // todo: remove test code
    const [depositInitialOwner, depositInitialAccount] = await createTokenAccount(this.depositToken)
    await this.depositToken.mintTo(depositInitialAccount, new Amount('100000000000000'))

    logger.info('Deposit as much as threshold')
    const [, /*depositOwner*/ depositAccount] = await createDeposit(
      minter,
      depositInitialOwner,
      depositInitialAccount,
      new PublicKey(asset.boardKey),
      configInfo.whitelistThreshold
    )

    // logger.info(`${symbol} mintable:`, (await minter.boardInfo(symbolBuffer)).isMintable)

    const depositInfo = await minter.depositInfo(depositAccount)
    logger.info('Deposit:', depositInfo)
  }

  async boardInfo(symbol: string): Promise<void> {
    const minter = await this.get()
    const asset = await this.assetService.get(symbol)
    console.log(asset)
    logger.info(await minter.boardInfo(new PublicKey(asset.boardKey)))
  }
  /*
    async withdraw(): Promise<void> {
      logger.info('Witndraw a little amount')
      await minter.withdraw(
        depositOwner,
        depositAccount,
        depositReceiver,
        symbolBuffer,
        new Amount(10)
      )
    }
  
    async mint(): Promise<void> {
      // Create asset token receiver
      logger.info('Create Asset Receiver')
      const [assetReceiverOwner, assetReceiver] = await createTokenAccount(assetToken)
  
      logger.info('Create Mint Position')
      const targetMintedAmount = new Amount(7)
      const [positionOwner, positionAccount] = await createMintPosition(
        minter,
        collateralInitialOwner,
        collateralInitialAccount,
        assetToken.programId,
        assetReceiver,
        symbolBuffer,
        new Amount(
          targetMintedAmount
            .mul(oraclePrice)
            .divn(Math.pow(10, oracleDecimals))
            .muln(Math.pow(10, configInfo.decimals))
            .div(configInfo.mintCapacity)
            .toString()
        ),
      )
  
      const assetReceiverInfo = await assetToken.accountInfo(assetReceiver)
      assert(assetReceiverInfo.amount.eq(targetMintedAmount), 'Minted coins differ with expected amount')
    }
    */
}
