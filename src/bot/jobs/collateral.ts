import * as bluebird from 'bluebird'
import { Updater } from 'lib/Updater'
import { BlockUpdater, getOraclePrice } from 'lib/terra'
import { getPairPrice } from 'lib/mirror'
import { getaUSTPrice } from 'lib/anchor'
import { num } from 'lib/num'
import { assetService, oracleService } from 'services'
import { AssetEntity } from 'orm'

const updater = new Updater(200)
const blockUpdater = new BlockUpdater()

async function getPrice(asset: AssetEntity): Promise<string> {
  const { symbol } = asset

  switch (symbol) {
    case 'LUNA':
      return getOraclePrice('uusd')

    case 'aUST':
      return getaUSTPrice()

    case 'ANC':
      return getPairPrice(asset.pair)

    case 'bLUNA':
      return num(await getPairPrice(asset.pair))
        .multipliedBy(await getOraclePrice('uusd'))
        .toString()
  }
}

export async function updateCollateralPrice(): Promise<void> {
  const now = Date.now()
  if (!updater.needUpdate(now)) {
    return
  }

  // run at every block updated
  const { isBlockUpdated } = await blockUpdater.updateBlockHeight()
  if (!isBlockUpdated) {
    return
  }

  const assets = await assetService().getCollateralAssets()

  await bluebird.map(assets, async (asset) => {
    const { token } = asset
    const price = await getPrice(asset)

    price && (await oracleService().setOHLC(token, Date.now(), price))
  })
}
