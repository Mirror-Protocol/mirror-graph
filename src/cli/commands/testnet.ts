import { Coin, Coins } from '@terra-money/terra.js'
import { Container } from 'typedi'
import { program } from 'commander'
import { getKey } from 'lib/keystore'
import * as logger from 'lib/logger'
import { TxWallet, contractQuery } from 'lib/terra'
import { num } from 'lib/num'
import {
  GovService,
  AssetService,
  MintService,
  MarketService,
  AccountService,
  ContractService,
} from 'services'
import { ContractType } from 'types'
import config from 'config'
import { writeOracleAddresses } from './utils'

async function prices(): Promise<void> {
  const assetService = Container.get(AssetService)
  const assets = await assetService.getAll()

  for (const asset of assets) {
    const pool = await assetService.getPool(asset)
    const price = await assetService.getPrice(asset)

    logger.info(
      `${asset.symbol} - price: ${price}, assetPool: ${pool.assetPool}, collateral: ${pool.collateralPool}, total: ${pool.totalShare}`
    )
  }
}

export function testnet(): void {
  const govService = Container.get(GovService)
  const mintService = Container.get(MintService)
  const marketService = Container.get(MarketService)
  const assetService = Container.get(AssetService)
  const accountService = Container.get(AccountService)
  const contractService = Container.get(ContractService)

  program
    .command('whitelisting-testnet')
    .requiredOption('--owner <owner-password>', 'owner key password')
    .action(async ({ owner }) => {
      const assets = {
        mAAPL: 'Apple',
        mGOOGL: 'Google',
        mTSLA: 'Tesla',
        // mNFLX: 'Netflix',
        // mQQQ: 'Invesco QQQ Trust',
        // mTWTR: 'Twitter',
        // mBABA: 'Alibaba Group Holdings Ltd ADR',
        // mIAU: 'iShares Gold Trust',
        // mSLV: 'iShares Silver Trust',
        // mUSO: 'United States Oil Fund, LP',
        // mVIXY: 'ProShares VIX',
      }
      for (const symbol of Object.keys(assets)) {
        await govService.whitelisting(
          symbol,
          assets[symbol],
          new TxWallet(getKey(config.KEYSTORE_PATH, config.OWNER_KEY, owner))
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
        if (asset.symbol === config.MIRROR_TOKEN_SYMBOL) {
          continue
        }
        await mintService.mint(asset, Coin.fromString('10000000000uusd'), wallet)

        const { balance } = await accountService.getAssetBalance(wallet.key.accAddress, asset)
        const oraclePrice = await assetService.getOraclePrice(asset)

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
      await prices()
    })

  program.command('price-testnet').action(async () => {
    await prices()
  })

  program.command('buy-simul <symbol> <coin>').action(async (symbol, coinString) => {
    const coin = Coin.fromString(coinString)
    const asset = await assetService.get({ symbol })
    const marketContract = await contractService.get({ asset, type: ContractType.MARKET })

    const simulated = await contractQuery(marketContract.address, {
      simulation: { offerAmount: coin.amount.toString(), operation: 'buy', symbol },
    })

    logger.info(simulated)
  })

  program.command('buy-simul-reverse <coin>').action(async (symbol, coinString) => {
    const coin = Coin.fromString(coinString)
    const asset = await assetService.get({ symbol })
    const marketContract = await contractService.get({ asset, type: ContractType.MARKET })

    const simulated = await contractQuery(marketContract.address, {
      reverseSimulation: { askAmount: coin.amount.toString(), operation: 'buy' },
    })

    logger.info(simulated)
  })

  program.command('sell-simul <coin>').action(async (coinString) => {
    const coin = Coin.fromString(coinString)
    const asset = await assetService.get({ symbol: coin.denom })
    const marketContract = await contractService.get({ asset, type: ContractType.MARKET })

    const simulated = await contractQuery(marketContract.address, {
      simulation: { offerAmount: coin.amount.toString(), operation: 'sell', symbol: coin.denom },
    })

    logger.info(simulated)
  })

  program
    .command('buy <symbol> <coin>')
    .requiredOption('--owner <owner-password>', 'owner key password')
    .action(async (symbol, coin, { owner }) => {
      const asset = await assetService.get({ symbol })
      const wallet = new TxWallet(getKey(config.KEYSTORE_PATH, config.OWNER_KEY, owner))
      const marketContract = await contractService.get({ asset, type: ContractType.MARKET })

      logger.info(`buy ${symbol}, ${coin}`)
      const tx = await wallet
        .execute(marketContract.address, { buy: { symbol } }, new Coins(coin))
        .catch((error) => {
          throw new Error(error)
        })

      const offer = tx.logs[0].events[1].attributes[2].value
      const receive = tx.logs[0].events[1].attributes[3].value
      const spread = tx.logs[0].events[1].attributes[4].value
      const fee = tx.logs[0].events[1].attributes[5].value

      logger.info(`offer: ${offer}, receive: ${receive}, spread: ${spread}, fee ${fee}`)
      logger.info(await accountService.getBalances(wallet.key.accAddress))
    })

  program
    .command('sell <coin>')
    .requiredOption('--owner <owner-password>', 'owner key password')
    .action(async (coin, { owner }) => {
      const sellCoin = Coin.fromString(coin)
      const asset = await assetService.get({ symbol: sellCoin.denom })
      const wallet = new TxWallet(getKey(config.KEYSTORE_PATH, config.OWNER_KEY, owner))
      const tokenContract = await contractService.get({ asset, type: ContractType.TOKEN })
      const marketContract = await contractService.get({ asset, type: ContractType.MARKET })

      // execute sell
      logger.info(`sell ${sellCoin.amount.toString()}${sellCoin.denom}`)
      logger.info(await accountService.getBalances(wallet.key.accAddress))
      const tx = await wallet.execute(tokenContract.address, {
        send: {
          amount: sellCoin.amount.toString(),
          contract: marketContract.address,
          msg: Buffer.from('{"sell": {"max_spread": "0.1"}}').toString('base64'),
        },
      })
      logger.info(tx)

      const offer = tx.logs[0].events[1].attributes[7].value
      const receive = tx.logs[0].events[1].attributes[8].value
      const spread = tx.logs[0].events[1].attributes[9].value
      const fee = tx.logs[0].events[1].attributes[10].value

      logger.info(`offer: ${offer}, receive: ${receive}, spread: ${spread}, fee ${fee}`)
      logger.info(await accountService.getBalances(wallet.key.accAddress))
    })

  program
    .command('balance')
    .requiredOption('--owner <owner-password>', 'owner key password')
    .action(async ({ owner }) => {
      const wallet = new TxWallet(getKey(config.KEYSTORE_PATH, config.OWNER_KEY, owner))
      logger.info(await accountService.getBalances(wallet.key.accAddress))
    })

  program.command('mint-config <symbol>').action(async (symbol) => {
    const asset = await assetService.get({ symbol })
    logger.info(await mintService.getConfigGeneral(asset))
  })
}
