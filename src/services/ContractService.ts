import { Repository } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Service } from 'typedi'
import { Contract } from 'orm'
import { MnemonicKey } from '@terra-money/terra.js'
import { storeCode, instantiateContract } from 'lib/terra'
// import * as logger from 'lib/logger'

const mk = new MnemonicKey({
  mnemonic:
    'satisfy adjust timber high purchase tuition stool faith fine install that you unaware feed domain license impose boss human eager hat rent enjoy dawn',
})

@Service()
export class ContractService {
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

  async storeCodes(): Promise<Contract> {
    return this.contractRepo.save({
      codeIds: {
        mint: await storeCode('src/contracts/mirror_mint.wasm', mk.privateKey),
        oracle: await storeCode('src/contracts/mirror_oracle.wasm', mk.privateKey),
        token: await storeCode('src/contracts/mirror_erc20.wasm', mk.privateKey),
        market: await storeCode('src/contracts/mirror_market.wasm', mk.privateKey),
      },
    })
  }

  async create(): Promise<Contract> {
    const contract = await this.get()

    contract.mint = await instantiateContract(
      contract.codeIds.mint,
      {
        collateral_denom: 'uluna', // eslint-disable-line
        deposit_denom: 'uusd', // eslint-disable-line
        whitelist_threshold: '1000000', // eslint-disable-line
        auction_discount: '100000', // eslint-disable-line
        auction_begin_capacity: '850000', // eslint-disable-line
        mint_capacity: '700000', // eslint-disable-line
        decimals: 6,
      },
      mk.privateKey
    )

    // await instantiateContract(
    //   codeIds.token,
    //   {
    //     name: 'test',
    //     symbol: 'TEST',
    //     decimals: 6,
    //     owner: mk.accAddress,
    //     initial_balances: [], // eslint-disable-line
    //   },
    //   mk.privateKey
    // )

    return this.contractRepo.save(contract)
  }
}
