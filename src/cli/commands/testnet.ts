import { Coin } from '@terra-money/terra.js'
import { Container } from 'typedi'
import { program } from 'commander'
import { getKey } from 'lib/keystore'
import { num } from 'lib/num'
import * as logger from 'lib/logger'
import { TxWallet } from 'lib/terra'
import {
  GovService,
  AssetService,
  MintService,
  PoolService,
  PriceService,
  AccountService,
  OracleService,
} from 'services'
import config from 'config'

async function prices(): Promise<void> {
  const assetService = Container.get(AssetService)
  const priceService = Container.get(PriceService)
  const poolService = Container.get(PoolService)
  const assets = await assetService.getAll()

  for (const asset of assets) {
    const pool = await poolService.getPool(asset)
    const price = await priceService.getContractPrice(asset)

    logger.info(
      `${asset.symbol} - price: ${price}, assetPool: ${pool.assetAmount}, collateral: ${pool.collateralAmount}, total: ${pool.totalShare}`
    )
  }
}

export function testnet(): void {
  const govService = Container.get(GovService)
  const mintService = Container.get(MintService)
  const poolService = Container.get(PoolService)
  const assetService = Container.get(AssetService)
  const accountService = Container.get(AccountService)
  const oracleService = Container.get(OracleService)

  program
    .command('whitelisting-testnet')
    .requiredOption('--owner <owner-password>', 'owner key password')
    .requiredOption('--oracle <oracle-password>', 'oracle key password')
    .action(async ({ owner, oracle }) => {
      const assets = {
        mAAPL: 'Apple',
        mGOOGL: 'Google',
        mTSLA: 'Tesla',
        mNFLX: 'Netflix',
        mQQQ: 'Invesco QQQ Trust',
        mTWTR: 'Twitter',
        mBABA: 'Alibaba Group Holdings Ltd ADR',
        mIAU: 'iShares Gold Trust',
        mSLV: 'iShares Silver Trust',
        mUSO: 'United States Oil Fund, LP',
        mVIXY: 'ProShares VIX',
      }
      for (const symbol of Object.keys(assets)) {
        await govService.whitelisting(
          new TxWallet(getKey(config.KEYSTORE_PATH, config.OWNER_KEY, owner)),
          new TxWallet(getKey(config.KEYSTORE_PATH, config.ORACLE_KEY, oracle)),
          symbol,
          assets[symbol],
        )
        logger.info(`${symbol} whitelisted`)
      }
    })

  program
    .command('lp-testnet')
    .requiredOption('-p, --password <lp-password>', 'lp key password')
    .action(async ({ password }) => {
      const wallet = new TxWallet(getKey(config.KEYSTORE_PATH, config.LP_KEY, password))
      const assets = await assetService.getAll()

      for (const asset of assets) {
        if (asset.symbol === config.MIRROR_TOKEN_SYMBOL) {
          continue
        }
        await mintService.openPosition(wallet, asset.symbol, Coin.fromString('10000000000uusd'), '1.5')

        const { balance } = await accountService.getAssetBalance(wallet.key.accAddress, asset)
        const oraclePrice = await oracleService.getPrice(asset)

        console.log(
          `${asset.symbol} provide liquidity -`,
          `price: ${oraclePrice},`,
          `balance: ${balance},`,
          `uusd: ${num(oraclePrice).multipliedBy(balance)}`
        )
        await poolService.provideLiquidity(
          wallet,
          asset,
          balance,
          num(oraclePrice).multipliedBy(balance).toFixed(0)
        )
      }
      await prices()
    })

  program.command('price-testnet').action(async () => {
    await prices()
  })
}
