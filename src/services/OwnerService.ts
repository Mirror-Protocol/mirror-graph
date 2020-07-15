import { Repository } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Service } from 'typedi'
import { Contract } from 'orm'
import { Key } from '@terra-money/terra.js'
import { storeCode, instantiate, execute, contractInfo } from 'lib/terra'
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

  async get(): Promise<Contract> {
    return this.contract || this.load()
  }

  async storeCodes(key: Key): Promise<Contract> {
    return this.contractRepo.save({
      codeIds: {
        mint: await storeCode('src/contracts/mirror_mint.wasm', key),
        oracle: await storeCode('src/contracts/mirror_oracle.wasm', key),
        token: await storeCode('src/contracts/mirror_erc20.wasm', key),
        market: await storeCode('src/contracts/mirror_market.wasm', key),
      },
    })
  }

  async create(key: Key): Promise<Contract> {
    const contract = await this.get()

    contract.mint = await instantiate(
      contract.codeIds.mint,
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

    contract.market = await instantiate(
      contract.codeIds.market,
      {
        mint: contract.mint,
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

    this.printContractInfo()

    return this.contractRepo.save(contract)
  }

  async printContractInfo(): Promise<void> {
    const contract = await this.get()

    logger.info('mint', await contractInfo(contract.mint))
    logger.info('market', await contractInfo(contract.market))
  }

  async configMint(
    options: {
      collateralDenom?: string
      depositDenom?: string
      whitelistThreshold?: string
      auctionDiscount?: string
      auctionThresholdRate?: string
      mintCapacity?: string
      owner?: string
    },
    key: Key
  ): Promise<void> {
    const contract = await this.get()

    await execute(
      contract.mint,
      {
        updateConfig: options,
      },
      key
    )

    logger.info('mint', await contractInfo(contract.mint))
  }
}
