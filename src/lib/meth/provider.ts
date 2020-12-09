import { ethers } from 'ethers'

let provider: ethers.providers.BaseProvider

export function getProvider(): ethers.providers.BaseProvider {
  if (!provider) {
    provider = ethers.getDefaultProvider(
      process.env.TERRA_CHAIN_ID === 'columbus-4' ? 'homestead' :'ropsten',
      {
        infura: {
          projectId: process.env.INFURA_ID,
          projectSecret: process.env.INFURA_SECRET,
        }
      }
    )
  }

  return provider
}
