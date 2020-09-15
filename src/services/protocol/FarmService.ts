import { Service, Inject } from 'typedi'
import { TxInfo } from '@terra-money/terra.js'
import { TxWallet } from 'lib/terra'
import { AssetEntity } from 'orm'
import { ContractType } from 'types'
import { AssetService, ContractService } from 'services'

@Service()
export class FarmService {
  constructor(
    @Inject((type) => AssetService) private readonly assetService: AssetService,
    @Inject((type) => ContractService) private readonly contractService: ContractService
  ) {}

  async stake(asset: AssetEntity, amount: string, wallet: TxWallet): Promise<TxInfo> {
    const lpTokenContract = await this.contractService.get({ asset, type: ContractType.LP_TOKEN })
    const stakingContract = await this.contractService.get({ asset, type: ContractType.STAKING })

    return wallet.execute(lpTokenContract.address, {
      send: {
        amount,
        contract: stakingContract.address,
        msg: Buffer.from('{"bond": {}}').toString('base64'),
      },
    })
  }

  async unstake(asset: AssetEntity, amount: string, wallet: TxWallet): Promise<TxInfo> {
    const stakingContract = await this.contractService.get({ asset, type: ContractType.STAKING })

    return wallet.execute(stakingContract.address, { unbond: { amount } })
  }
}
