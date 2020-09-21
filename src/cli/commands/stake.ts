import { Coin } from '@terra-money/terra.js'
import { Container } from 'typedi'
import { program } from 'commander'
import { StakeService, AssetService, GovService } from 'services'
import * as logger from 'lib/logger'
import { getKey } from 'lib/keystore'
import { TxWallet } from 'lib/terra'
import config from 'config'

export function stake(): void {
  const assetService = Container.get(AssetService)
  const stakeService = Container.get(StakeService)
  const govService = Container.get(GovService)

  program
    .command('stake <lptoken-amount>')
    .description('stake LP Token. eg) stake 100mAAPL-LP')
    .requiredOption('-p, --password <lp-password>', 'lp key password')
    .action(async (lpTokenAmount, { password }) => {
      const wallet = new TxWallet(getKey(config.KEYSTORE_PATH, config.LP_KEY, password))
      const coin = Coin.fromString(lpTokenAmount.replace('-LP', ''))
      const asset = await assetService.get({ symbol: coin.denom })

      const tx = await stakeService.stake(wallet, asset, coin.amount.toString())
      logger.info(tx)
    })

  program
    .command('unstake <lptoken-amount>')
    .description('stake LP Token. eg) unstake 100mAAPL-LP')
    .requiredOption('-p, --password <lp-password>', 'lp key password')
    .action(async (lpTokenAmount, { password }) => {
      const wallet = new TxWallet(getKey(config.KEYSTORE_PATH, config.LP_KEY, password))
      const coin = Coin.fromString(lpTokenAmount.replace('-LP', ''))
      const asset = await assetService.get({ symbol: coin.denom, gov: govService.get() })

      const tx = await stakeService.unstake(wallet, asset, coin.amount.toString())
      logger.info(tx)
    })

  program
    .command('withdraw-rewards <symbol>')
    .description('withdraw rewards. eg) withdraw-rewards mAAPL-LP')
    .requiredOption('-p, --password <lp-password>', 'lp key password')
    .action(async (symbol, { password }) => {
      const wallet = new TxWallet(getKey(config.KEYSTORE_PATH, config.LP_KEY, password))
      const asset = await assetService.get({ symbol }) || undefined

      logger.info(await stakeService.withdrawRewards(wallet, asset))
    })

  program
    .command('stake-pool <symbol>')
    .action(async (symbol) => {
      const asset = await assetService.get({ symbol })

      logger.info(await stakeService.getPool(asset))
    })
}
