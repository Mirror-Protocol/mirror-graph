import { ethers } from 'ethers'

let provider: ethers.providers.BaseProvider

export function getProvider(): ethers.providers.BaseProvider {
  if (!provider) {
    provider = new ethers.providers.JsonRpcProvider(
      process.env.TERRA_CHAIN_ID.includes('columbus')
        ? 'https://bsc-dataseed1.binance.org:443'
        : 'https://data-seed-prebsc-1-s1.binance.org:8545',
    )
  }

  return provider
}
