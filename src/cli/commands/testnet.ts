import { Coin } from '@terra-money/terra.js'
import * as fs from 'fs'
import { Container } from 'typedi'
import { program } from 'commander'
import { GovService, AssetService, MintService, MarketService, AccountService } from 'services'
import { getKey } from 'lib/keystore'
import * as logger from 'lib/logger'
import { TxWallet } from 'lib/terra'
import { num } from 'lib/num'
import config from 'config'

async function writeOracleAddresses(): Promise<void> {
  const assetService = Container.get(AssetService)
  const assets = await assetService.getAll()
  const address = {}
  for (const asset of assets) {
    if (asset.symbol === config.MIRROR_SYMBOL) {
      continue
    }
    address[asset.symbol.substring(1)] = asset.oracle
  }
  fs.writeFileSync('./address.json', JSON.stringify(address))
  logger.info(address)
}

export function testnet(): void {
  const govService = Container.get(GovService)
  const mintService = Container.get(MintService)
  const marketService = Container.get(MarketService)
  const assetService = Container.get(AssetService)
  const accountService = Container.get(AccountService)

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
          symbol,
          assets[symbol],
          new TxWallet(getKey(config.KEYSTORE_PATH, config.OWNER_KEY, owner)),
          new TxWallet(getKey(config.KEYSTORE_PATH, config.ORACLE_KEY, oracle))
        )
      }
      await writeOracleAddresses()
    })

  program
    .command('lp-testnet')
    .requiredOption('-p, --password <lp-password>', 'lp key password')
    .action(async ({ password }) => {
      const assets = await assetService.getAll()
      const wallet = new TxWallet(getKey(config.KEYSTORE_PATH, config.LP_KEY, password))

      for (const asset of assets) {
        if (asset.symbol === config.MIRROR_SYMBOL) {
          continue
        }
        await mintService.mint(asset.symbol, Coin.fromString('100000000uusd'), wallet)

        const { balance } = await accountService.getBalance(asset.symbol, wallet.key.accAddress)
        const oraclePrice = await assetService.getOraclePrice(asset.symbol)

        console.log(
          `${asset.symbol} provide liquidity -`,
          `price: ${oraclePrice.price},`,
          `balance: ${balance},`,
          `uusd: ${num(oraclePrice.price).multipliedBy(balance)}`
        )
        await marketService.provideLiquidity(
          new Coin(asset.symbol, balance),
          new Coin('uusd', num(oraclePrice.price).multipliedBy(balance).toFixed(0)),
          wallet
        )
      }
    })
}
