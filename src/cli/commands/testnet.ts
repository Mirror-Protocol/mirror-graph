import * as fs from 'fs'
import { Container } from 'typedi'
import { program } from 'commander'
import { MnemonicKey, Coin, Coins } from '@terra-money/terra.js'
import {
  AssetService,
  ContractService,
  LPService,
  OwnerService,
  GovService,
  PriceService,
} from 'services'
import * as logger from 'lib/logger'
import { num } from 'lib/num'
import { storeCode, execute, lcd } from 'lib/terra'

// const symbols = ['mAAPL', 'mGOOGL', 'mTSLA', 'mNFLX', 'mQQQ', 'mTWTR', 'mBABA', 'mIAU', 'mSLV', 'mUSO', 'mVIXY']
const symbols = ['sBTC', 'sETH', 'sXRP', 'sLTC', 'sBCH', 'sXMR', 'sEOS', 'sBAT', 'sXLM', 'sADA']

// for tequila
const contractId = 38
const ownerKey = new MnemonicKey({
  mnemonic:
    'faith cage edge human stay chat short observe hawk barely tattoo song cake waste galaxy boat model sleep brick sad coast belt elder bless',
})
const lpKey = new MnemonicKey({
  mnemonic:
    'faith cage edge human stay chat short observe hawk barely tattoo song cake waste galaxy boat model sleep brick sad coast belt elder bless',
})
const oracleKey = new MnemonicKey({
  mnemonic:
    'have student popular emotion shoulder tuition hurry enforce noise evil turkey lamp whip table heart seminar awful fruit nurse pair seed one wagon nurse',
})
const userKey = new MnemonicKey({
  mnemonic:
    'glide gravity pretty mystery bachelor simple taste sure whale custom defense pulp ancient scrub weekend notable journey hold biology gun truly agent bicycle borrow',
})

/*
// for localterra
const contractId = 37
// ownerKey: test1
const ownerKey = new MnemonicKey({ mnemonic: 'notice oak worry limit wrap speak medal online prefer cluster roof addict wrist behave treat actual wasp year salad speed social layer crew genius' })
// lpKey: test1
const lpKey = new MnemonicKey({ mnemonic: 'notice oak worry limit wrap speak medal online prefer cluster roof addict wrist behave treat actual wasp year salad speed social layer crew genius' })
// oracleKey: test2
const oracleKey = new MnemonicKey({ mnemonic: 'symbol force gallery make bulk round subway violin worry mixture penalty kingdom boring survey tool fringe patrol sausage hard admit remember broken alien absorb' })
// userKey: test10
const userKey = new MnemonicKey({ mnemonic: 'prefer forget visit mistake mixture feel eyebrow autumn shop pair address airport diesel street pass vague innocent poem method awful require hurry unhappy shoulder' })
*/

export function testnet(): void {
  const contractService = Container.get(ContractService)
  const lpService = Container.get(LPService)
  const assetService = Container.get(AssetService)
  const ownerService = Container.get(OwnerService)
  const govService = Container.get(GovService)
  const priceService = Container.get(PriceService)

  program.command('testnet-blockinfo').action(async () => {
    logger.info(await lcd.tendermint.blockInfo())
  })

  program.command('testnet-store-codes').action(async () => {
    // 1. store code
    const codeIds: { [contract: string]: number } = {
      mint: await storeCode('src/contracts/mirror_mint.wasm', ownerKey),
      oracle: await storeCode('src/contracts/mirror_oracle.wasm', ownerKey),
      token: await storeCode('src/contracts/mirror_erc20.wasm', ownerKey),
      market: await storeCode('src/contracts/mirror_market.wasm', ownerKey),
      staking: await storeCode('src/contracts/mirror_staking.wasm', ownerKey),
      stakingToken: await storeCode('src/contracts/mirror_staking_erc20.wasm', ownerKey),
    }

    logger.info('stored codes', codeIds)
  })

  program.command('testnet-init').action(async () => {
    const codeIds = {
      // tequila-0002
      mint: 14,
      oracle: 15,
      token: 16,
      market: 17,
      staking: 18,
      stakingToken: 19,

      // localterra
      // mint: 9,
      // oracle: 10,
      // token: 11,
      // market: 12
    }
    logger.info('stored codes', codeIds)

    // 1. instatiate contracts, save contract information to db
    const contract = await contractService.create(codeIds, ownerKey)
    logger.info(`created mirror contract. id: ${contract.id}`, contract)

    // 2. load contract
    await contractService.load(contract.id)

    // 3. config whitelist threshold to 1luna
    await ownerService.configMint({ whitelistThreshold: '1000000' }, ownerKey)

    // 4. whitelisting symbols
    for (const symbol of symbols) {
      // whitelisting
      await govService.whitelisting(symbol, symbol.substring(1), lpKey, oracleKey)
      // deposit 1luna
      await govService.deposit(symbol, Coin.fromString('1000000uluna'), lpKey)
      // create pool
      await ownerService.createPool(symbol, lpKey)

      const whitelistInfo = await govService.getWhitelist(symbol)
      logger.info(
        `deposit to ${symbol}, mintable: ${whitelistInfo.isMintable}, total deposit: ${whitelistInfo.totalDeposit}`
      )
    }

    // 5. provide liquidity of 100000usd
    await lpService.provideLiquidity(Coin.fromString('100000000000uusd'), lpKey)

    // 6. export oracle addresses
    const assets = await assetService.getAll()
    const address = {}
    for (const asset of assets) {
      address[asset.symbol.substring(1)] = asset.oracle
    }
    fs.writeFileSync('./address.json', JSON.stringify(address))

    logger.info('saved oracle addresses into address.json')
    logger.info('waiting for vote..')
  })

  program.command('testnet-lp-status').action(async () => {
    await contractService.load(contractId)

    // await lpService.provideLiquidity(Coin.fromString('100000000000uusd'), lpKey)
    // logger.info(await lpService.getLiquidityAmount('uusd', lpKey.accAddress))
    // logger.info(await lpService.getCollateral())
    logger.info(await ownerService.getPoolAmount('sADA'))
    // for (const symbol of symbols) {
    //   logger.info(await assetService.getWhitelist(symbol))
    //   logger.info(await ownerService.getPoolAmount(symbol))
    // }
  })

  program.command('testnet-mint').action(async () => {
    await contractService.load(contractId)

    // mint
    for (const symbol of symbols) {
      const coin = new Coin('uusd', '10000000000')

      await lpService.mint(symbol, coin, lpKey)

      logger.info(`${symbol}: mint ${coin.amount}${coin.denom}`)
    }
  })

  program.command('testnet-provide-liquidity').action(async () => {
    const contract = await contractService.load(contractId)

    for (const symbol of symbols) {
      const mintPosition = await lpService.getMintPosition(symbol, lpKey.accAddress)
      const liquidityAmount = await lpService.getLiquidityAmount(symbol, lpKey.accAddress)
      const provideCoin = new Coin(
        symbol,
        num(mintPosition.assetAmount).minus(num(liquidityAmount)).toNumber()
      )

      logger.info(
        `${symbol}: collateral: ${mintPosition.collateralAmount}, mint: ${mintPosition.assetAmount}, liquidity: ${liquidityAmount}`
      )
      if (+provideCoin.amount < 1) {
        continue
      }

      // approve token transfer
      await assetService.approve(provideCoin, contract.market, lpKey)

      // provide liquidity
      await lpService.provideLiquidity(provideCoin, lpKey)

      logger.info(`${symbol}: provide liquidity ${provideCoin.amount}`)
    }
  })

  program.command('testnet-buy <symbol> <coin>').action(async (symbol, coin) => {
    const contract = await contractService.load(contractId)

    await execute(contract.market, { buy: { symbol } }, userKey, new Coins(coin))
  })

  program.command('testnet-sell <coin>').action(async (coin) => {
    const contract = await contractService.load(contractId)
    const sellCoin = Coin.fromString(coin)
    console.log(sellCoin)

    await execute(
      contract.market,
      { sell: { symbol: sellCoin.denom, amount: sellCoin.amount.toString() } },
      userKey
    )
  })

  program.command('testnet-balance').action(async () => {
    await contractService.load(contractId)

    const assets = await assetService.getAll()
    for (const asset of assets) {
      const balance = await assetService.getBalance(asset.symbol, userKey.accAddress)
      logger.info(`${asset.symbol}: ${+balance / 1000000}`)
    }
  })

  program.command('testnet-price').action(async () => {
    await contractService.load(contractId)

    const assets = await assetService.getAll()
    for (const asset of assets) {
      const priceInfo = await priceService.getLatestPrice(asset)
      logger.info(`${asset.symbol}: ${priceInfo.close}`)
    }
  })

  program.command('testnet-test').action(async () => {
    console.log(await lcd.bank.balance(ownerKey.accAddress))
  })
}
