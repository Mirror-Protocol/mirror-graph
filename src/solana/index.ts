import { Account } from '@solana/web3.js'
import { loadProgram } from './lib'

export async function loadTokenProgram(): Promise<Account> {
  return loadProgram('./bpf/solana_bpf_rust_token.so')
}

export async function loadOracleProgram(): Promise<Account> {
  return loadProgram('./bpf/solana_bpf_rust_oracle.so')
}

export async function loadMarketProgram(): Promise<Account> {
  return loadProgram('./bpf/solana_bpf_rust_market.so')
}

export async function loadMintProgram(): Promise<Account> {
  return loadProgram('./bpf/solana_bpf_rust_mint.so')
}

export * from './mint'
export * from './oracle'
export * from './token'
export * from './entities'
