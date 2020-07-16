import { Repository } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Service } from 'typedi'
import { Contract, CodeIds } from 'orm'
import { Key } from '@terra-money/terra.js'
import { instantiate, contractInfo } from 'lib/terra'
import * as logger from 'lib/logger'

@Service()
export class OwnerService {
  private contract: Contract

  constructor(@InjectRepository(Contract) private readonly contractRepo: Repository<Contract>) {}

  async load(id?: number): Promise<Contract> {
    const findOptions = id ? { id } : { order: { createdAt: 'DESC' } }

    this.contract = await this.contractRepo.findOne(findOptions)
    if (!this.contract) {
      throw new Error(`There is no contract ${id}`)
    }

    return this.contract
  }

  async getContract(): Promise<Contract> {
    return this.contract || this.load()
  }

  async create(codeIds: CodeIds, key: Key): Promise<Contract> {
    const mint = await instantiate(
      codeIds.mint,
      {
        collateralDenom: 'uusd',
        depositDenom: 'uluna',
        whitelistThreshold: '1000000000000',
        auctionDiscount: '0.1',
        auctionThresholdRate: '0.8',
        mintCapacity: '0.7',
        owner: key.accAddress,
      },
      key
    )

    const market = await instantiate(
      codeIds.market,
      {
        mint,
        collateralDenom: 'uusd',
        basePool: '1000000000000',
        commissionRate: '0.001', // 0.1%
        maxSpread: '0.01', // 1%
        minSpread: '0.001', // 0.1%
        marginThresholdRate: '0.05', // 5%
        marginDiscountRate: '0.01', // 1%
      },
      key
    )

    return this.contractRepo.save({ codeIds, mint, market, owner: key.accAddress })
  }

  async contractInfo(): Promise<void> {
    const contract = await this.getContract()

    logger.info('mint', await contractInfo(contract.mint))
    logger.info('market', await contractInfo(contract.market))
  }
}
