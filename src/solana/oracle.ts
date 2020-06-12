import { getConnection } from './lib/program'
import { PublicKey, Account } from '@solana/web3.js'
import { newSystemAccount, SymbolBuffer } from './lib'
import { Oracle } from './entities'

export async function createOracle(
  oracleAccount: Account,
  assertToken: PublicKey,
  baseToken: PublicKey,
  decimals: number,
  denom: SymbolBuffer,
  programID: PublicKey
): Promise<[Oracle, Account]> {
  const connection = await getConnection()
  const balanceNeeded = 1000000 + (await Oracle.getMinBalanceRentForExemptOracle(connection))
  const accountOwner = await newSystemAccount(connection, balanceNeeded)
  const oracle = await Oracle.createOracle(
    connection,
    oracleAccount,
    accountOwner,
    assertToken,
    baseToken,
    decimals,
    denom,
    programID
  )

  return [oracle, accountOwner]
}
