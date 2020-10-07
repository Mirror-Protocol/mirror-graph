import * as fs from 'fs'
import { CodeIds, Contracts, Asset, Assets, Whitelist } from 'types'
import * as logger from 'lib/logger'

const CODE_IDS_PATH = './data/codeIds.json'
const WHITELIST_PATH = './data/whitelist.json'
const CONTRACTS_PATH = './data/contracts.json'
const ASSETS_PATH = './data/assets.json'

function loadJSON(path: string): unknown {
  try {
    const data = JSON.parse(fs.readFileSync(path, 'utf8'))
    return data
  } catch (error) {
    throw new Error(`not provided ${path}`)
  }
}

function saveJSON(path: string, data: unknown): void {
  try {
    fs.writeFileSync(path, JSON.stringify(data))
    logger.error(`${path} saved`)
  } catch (error) {
    throw new Error(`${path} save failed`)
  }
}

export function loadCodeIds(): CodeIds | undefined {
  return loadJSON(CODE_IDS_PATH) as CodeIds
}

export function loadWhitelist(): Whitelist | undefined {
  return loadJSON(WHITELIST_PATH) as Whitelist
}

export function loadContracts(): Contracts | undefined {
  return loadJSON(CONTRACTS_PATH) as Contracts
}

export function loadAssets(): Assets | undefined {
  return loadJSON(ASSETS_PATH) as Assets
}

export function getAsset(symbol: string): Asset {
  const assets = loadAssets()
  const token = Object.keys(assets).find(token => assets[token].symbol === symbol)

  return assets[token]
}

export function saveAssets(assets: Assets): void {
  saveJSON(ASSETS_PATH, assets)
}
