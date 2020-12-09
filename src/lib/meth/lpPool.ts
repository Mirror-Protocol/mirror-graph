import { ethers } from 'ethers'
import { getProvider } from './'

const abi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "earned",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]

const contracts = {}

export function getLpPoolContract(lpContract: string): ethers.Contract {
  if (!contracts[lpContract]) {
    contracts[lpContract] = new ethers.Contract(lpContract, abi, getProvider())
  }

  return contracts[lpContract]
}

export async function balanceOfLpToken(lpContract: string, address: string): Promise<string> {
  const contract = getLpPoolContract(lpContract)
  if (!contract) {
    throw new Error(`undefined eth lpContract ${lpContract}`)
  }

  return contract.balanceOf(address)
}
