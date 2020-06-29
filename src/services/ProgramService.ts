import { Repository } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Service } from 'typedi'
import { Account, PublicKey } from '@solana/web3.js'
import {
  loadTokenProgram,
  loadOracleProgram,
  loadMintProgram,
  loadMarketProgram,
  createToken,
  createMinter,
  Amount,
  DECIMALS,
} from 'solana'
import { Program } from 'orm'
import * as logger from 'lib/logger'
import { encryptBuffer } from 'lib/crypto'

@Service()
export class ProgramService {
  private program: Program

  constructor(@InjectRepository(Program) private readonly programRepo: Repository<Program>) {}

  async load(): Promise<Program> {
    this.program = await this.programRepo.findOne({ order: { createdAt: 'DESC' } })
    if (!this.program) {
      throw new Error('There are no registered programs')
    }
    return this.program
  }

  async get(): Promise<Program> {
    return this.program || (await this.load())
  }

  async loadProgram(): Promise<Program> {
    logger.info('Load mirror programs to solana')

    const mintProgramId: Account = await loadMintProgram()
    const oracleProgramId: Account = await loadOracleProgram()
    const tokenProgramId: Account = await loadTokenProgram()
    const marketProgramId: Account = await loadMarketProgram()

    return this.programRepo.save({
      programIds: {
        mint: mintProgramId.publicKey.toBase58(),
        oracle: oracleProgramId.publicKey.toBase58(),
        token: tokenProgramId.publicKey.toBase58(),
        market: marketProgramId.publicKey.toBase58(),
      },
    })
  }

  async create(): Promise<Program> {
    const program = await this.get()
    const tokenProgramId = new PublicKey(program.programIds.token)
    const mintProgramId = new PublicKey(program.programIds.mint)

    logger.info('Create Deposit Token')
    const depositToken = await createToken(tokenProgramId, DECIMALS)

    logger.info('Create Collateral Token')
    const collateralToken = await createToken(tokenProgramId, DECIMALS)

    logger.info('Create Minter')
    const [minter, minterOwner] = await createMinter(
      collateralToken.programId,
      collateralToken.token,
      depositToken.programId,
      depositToken.token,
      DECIMALS,
      new Amount('700000') /* 70% */,
      new Amount('1000000000000') /* 1,000,000 */,
      mintProgramId
    )

    const configInfo = await minter.configInfo()
    logger.info('Config: ', configInfo)

    const saveData: Partial<Program> = {
      minter: {
        key: minter.config.toBase58(),
        ownerSecretKey: encryptBuffer(minterOwner.secretKey),
      },
      depositToken: {
        key: depositToken.token.toBase58(),
        ownerSecretKey: encryptBuffer(depositToken.tokenOwner.secretKey),
      },
      collateralToken: {
        key: collateralToken.token.toBase58(),
        ownerSecretKey: encryptBuffer(collateralToken.tokenOwner.secretKey),
      },
    }

    return this.programRepo.save(Object.assign(program, saveData))
  }
}
