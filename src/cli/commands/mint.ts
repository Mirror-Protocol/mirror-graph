import { Coin } from '@terra-money/terra.js'
import { Container } from 'typedi'
import { program } from 'commander'
import { AssetService, MintService } from 'services'
import * as logger from 'lib/logger'
import { getKey } from 'lib/keystore'
import { TxWallet } from 'lib/terra'
import config from 'config'

export function mint(): void {
  const mintService = Container.get(MintService)
  const assetService = Container.get(AssetService)

  program
    .command('open-position <symbol> <collateral-amount> <collateral-ratio>')
    .description('cdp open. eg) open-position mAAPL 150000000uusd 1.5')
    .requiredOption('-p, --password <lp-password>', 'lp key password')
    .action(async (symbol, collateralAmount, collateralRatio, { password }) => {
      const wallet = new TxWallet(getKey(config.KEYSTORE_PATH, config.LP_KEY, password))
      const collateral = Coin.fromString(collateralAmount)

      const tx = await mintService.openPosition(wallet, symbol, collateral, collateralRatio)
      logger.info(tx)
    })

  program
    .command('deposit-collateral <position-idx> <collateral-amount>')
    .description('deposit collateral to cdp. eg) deposit-collateral 1 100000000uusd')
    .requiredOption('-p, --password <lp-password>', 'lp key password')
    .action(async (positionIdx, collateralAmount, { password }) => {
      const wallet = new TxWallet(getKey(config.KEYSTORE_PATH, config.LP_KEY, password))
      const collateral = Coin.fromString(collateralAmount)

      const tx = await mintService.deposit(wallet, +positionIdx, collateral)
      logger.info(tx)
    })

  program
    .command('withdraw-collateral <position-idx> <collateral-amount>')
    .description('withdraw collateral from cdp. eg) withdraw-collateral 1 100000000uusd')
    .requiredOption('-p, --password <lp-password>', 'lp key password')
    .action(async (positionIdx, collateralAmount, { password }) => {
      const wallet = new TxWallet(getKey(config.KEYSTORE_PATH, config.LP_KEY, password))
      const collateral = Coin.fromString(collateralAmount)

      const tx = await mintService.withdraw(wallet, +positionIdx, collateral)
      logger.info(tx)
    })

  program
    .command('mint <position-idx> <asset-amount>')
    .description('mint asset of cdp. eg) mint 1 1000000mAAPL')
    .requiredOption('-p, --password <lp-password>', 'lp key password')
    .action(async (positionIdx, assetAmount, { password }) => {
      const wallet = new TxWallet(getKey(config.KEYSTORE_PATH, config.LP_KEY, password))
      const assetCoin = Coin.fromString(assetAmount)
      const asset = await assetService.get({ symbol: assetCoin.denom })

      const tx = await mintService.mint(wallet, asset, +positionIdx, assetCoin.amount.toString())
      logger.info(tx)
    })

  program
    .command('burn <position-idx> <asset-amount>')
    .description('burn asset of cdp. eg) burn 1 1000000mAAPL')
    .requiredOption('-p, --password <lp-password>', 'lp key password')
    .action(async (positionIdx, assetAmount, { password }) => {
      const wallet = new TxWallet(getKey(config.KEYSTORE_PATH, config.LP_KEY, password))
      const assetCoin = Coin.fromString(assetAmount)
      const asset = await assetService.get({ symbol: assetCoin.denom })

      const tx = await mintService.burn(wallet, asset, +positionIdx, assetCoin.amount.toString())
      logger.info(tx)
    })

  // program
  //   .command('burn <coin-amount>')
  //   .description('burn asset. eg) burn 1000mAAPL')
  //   .requiredOption('-p, --password <lp-password>', 'lp key password')
  //   .action(async (coinAmount, { password }) => {
  //     const coin = Coin.fromString(coinAmount)
  //     const wallet = new TxWallet(getKey(config.KEYSTORE_PATH, config.LP_KEY, password))
  //     const asset = await assetService.get({ symbol: coin.denom })

  //     logger.info(await mintService.burn(asset, coin.amount.toString(), wallet))
  //   })
}
