import { ethers } from 'ethers'

const abi = ['function isClaimed(uint256 index) public view returns (bool)']

const provider = ethers.getDefaultProvider(
  process.env.TERRA_CHAIN_ID === 'columbus-4' ? 'homestead' :'ropsten',
  {
    infura: {
      projectId: process.env.INFURA_ID,
      projectSecret: process.env.INFURA_SECRET,
    }
  }
)
const distributorContract = new ethers.Contract(
  '0x2A398bBa1236890fb6e9698A698A393Bb8ee8674',
  abi,
  provider,
)

export async function isAirdropClaimed(index: string): Promise<boolean> {
  return distributorContract.isClaimed(index)
}
