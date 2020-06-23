import { Repository } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Service, Inject } from 'typedi'
import { Account, PublicKey } from '@solana/web3.js'
import {
  createOracle,
  // createDeposit,
  // createTokenAccount,
  Amount,
  SymbolBuffer,
  Minter,
  getConnection,
  DECIMALS,
} from 'solana'
import { Asset } from 'orm'
import { ProgramService } from 'services'
import * as logger from 'lib/logger'
import { encrypt, decrypt } from 'lib/crypto'

@Service()
export class MinterService {
  private minter: Minter

  constructor(
    @Inject((type) => ProgramService) private readonly programService: ProgramService,
    @InjectRepository(Asset) private readonly assetRepo: Repository<Asset>
  ) {}

  async load(): Promise<Minter> {
    const {
      mintProgramId,
      minterOwnerSecretKey,
      minterKey,
      tokenProgramId,
      collateralTokenKey,
      depositTokenKey,
    } = await this.programService.get()
    this.minter = new Minter(
      await getConnection(),
      new PublicKey(mintProgramId),
      new Account(Buffer.from(decrypt(minterOwnerSecretKey))),
      new PublicKey(minterKey),
      new PublicKey(tokenProgramId),
      new PublicKey(collateralTokenKey),
      new PublicKey(tokenProgramId),
      new PublicKey(depositTokenKey)
    )

    return this.minter
  }

  async get(): Promise<Minter> {
    return this.minter || (await this.load())
  }

  async whitelisting(symbol: string): Promise<Asset> {
    const minter = await this.get()
    const program = await this.programService.get()
    const { tokenProgramId, oracleProgramId, collateralTokenKey } = program

    const oracleAccount = new Account()
    const symbolBuffer = new SymbolBuffer(symbol)

    logger.info('Create Board')

    const [boardAccountKey, assetToken] = await minter.createBoard(
      new PublicKey(tokenProgramId),
      oracleAccount.publicKey,
      symbolBuffer
    )

    const assetTokenInfo = await assetToken.tokenInfo()
    logger.info('Asset Token: ', assetTokenInfo)

    logger.info('Create Oracle')

    const [oracle, oracleOwner] = await createOracle(
      oracleAccount,
      assetToken.token,
      new PublicKey(collateralTokenKey),
      DECIMALS,
      symbolBuffer,
      new PublicKey(oracleProgramId)
    )

    logger.info('Update price')

    const oraclePrice = new Amount(1000 * Math.pow(10, DECIMALS))
    await oracle.updatePrice(oraclePrice)

    const oracleInfo = await oracle.oracleInfo()
    logger.info('Oracle: ', oracleInfo)
    logger.info('Oracle Price: ', oracleInfo.price.toString())

    const boardInfo = await minter.boardInfo(symbolBuffer)
    logger.info('Mint Board:', boardInfo)

    return this.assetRepo.save({
      program,
      symbol,
      assetKey: assetToken.token.toBase58(),
      boardKey: boardAccountKey.toBase58(),
      oracleKey: oracleAccount.publicKey.toBase58(),
      oracleOwnerSecretKey: encrypt(oracleOwner.secretKey.toString()),
    })
  }
}
