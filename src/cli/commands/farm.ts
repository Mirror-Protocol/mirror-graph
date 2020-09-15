import { Coin } from '@terra-money/terra.js'
import { Container } from 'typedi'
import { program } from 'commander'
import { FarmService, AssetService, GovService } from 'services'
import * as logger from 'lib/logger'
import { getKey } from 'lib/keystore'
import { TxWallet } from 'lib/terra'
import config from 'config'

export function farm(): void {
  const assetService = Container.get(AssetService)
  const farmService = Container.get(FarmService)
  const govService = Container.get(GovService)

  program
    .command('stake <lptoken-amount>')
    .description('stake LP Token. eg) stake 100mAAPL-LP')
    .requiredOption('-p, --password <lp-password>', 'lp key password')
    .action(async (lpTokenAmount, { password }) => {
      const wallet = new TxWallet(getKey(config.KEYSTORE_PATH, config.LP_KEY, password))
      const coin = Coin.fromString(lpTokenAmount.replace('-LP', ''))
      const asset = await assetService.get({ symbol: coin.denom, gov: govService.get() })

      logger.info(await farmService.stake(asset, coin.amount.toString(), wallet))
    })

  program
    .command('unstake <lptoken-amount>')
    .description('stake LP Token. eg) unstake 100mAAPL-LP')
    .requiredOption('-p, --password <lp-password>', 'lp key password')
    .action(async (lpTokenAmount, { password }) => {
      const wallet = new TxWallet(getKey(config.KEYSTORE_PATH, config.LP_KEY, password))
      const coin = Coin.fromString(lpTokenAmount.replace('-LP', ''))
      const asset = await assetService.get({ symbol: coin.denom, gov: govService.get() })

      logger.info(await farmService.unstake(asset, coin.amount.toString(), wallet))
    })

  program
    .command('withdraw-rewards <lp-token-symbol>')
    .description('withdraw rewards. eg) withdraw-rewards mAAPL-LP')
    .requiredOption('-p, --password <lp-password>', 'lp key password')
    .action(async (lpTokenSymbol, { password }) => {
      const wallet = new TxWallet(getKey(config.KEYSTORE_PATH, config.LP_KEY, password))
      const asset = await assetService.get({ lpTokenSymbol, gov: govService.get() })

      logger.info(await farmService.withdrawRewards(asset, wallet))
    })
}
