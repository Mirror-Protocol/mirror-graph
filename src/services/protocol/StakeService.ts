import { Service, Inject } from 'typedi'
import { TxInfo } from '@terra-money/terra.js'
import { TxWallet, contractQuery } from 'lib/terra'
import { AssetEntity } from 'orm'
import { GovService, ContractService } from 'services'

@Service()
export class StakeService {
  constructor(
    @Inject((type) => GovService) private readonly govService: GovService,
    @Inject((type) => ContractService) private readonly contractService: ContractService,
  ) {}

  async stake(wallet: TxWallet, asset: AssetEntity, amount: string): Promise<TxInfo> {
    const gov = this.govService.get()
    const bondMsg = `{"bond": {"asset_token":"${asset.address}"}}`

    return wallet.execute(asset.lpToken, {
      send: { amount, contract: gov.staking, msg: Buffer.from(bondMsg).toString('base64') }
    })
  }

  async unstake(wallet: TxWallet, asset: AssetEntity, amount: string): Promise<TxInfo> {
    const gov = this.govService.get()

    return wallet.execute(gov.staking, { unbond: { assetToken: asset.address, amount } })
  }

  async withdrawRewards(wallet: TxWallet, asset?: AssetEntity): Promise<TxInfo> {
    const gov = this.govService.get()
    const withdrawMsg = asset ? { assetToken: asset.address } : {}

    return wallet.execute(gov.staking, { withdraw: withdrawMsg })
  }

  async getPool(asset: AssetEntity): Promise<unknown> {
    const gov = this.govService.get()

    return contractQuery(gov.staking, { poolInfo: { assetToken: asset.address } })
  }
}
