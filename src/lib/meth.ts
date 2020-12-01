import { ethers } from 'ethers'

const abi = ['function isClaimed(uint256 index) public override view returns (bool)']
const provider = ethers.getDefaultProvider(
  process.env.TERRA_CHAIN_ID === 'columbus-4' ? 'homestead' :'ropsten'
)
const distributorContract = new ethers.Contract(
  process.env.TERRA_CHAIN_ID === 'columbus-4'
    ? '??'
    :'0xA15188DCdB6f22D634Ba4c2CEE987b98AfEa165d',
  abi,
  provider,
)

export async function isAirdropClaimed(index: string): Promise<boolean> {
  return distributorContract.isClaimed(index)
}
