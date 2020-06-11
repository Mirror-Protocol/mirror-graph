import { PublicKey, Account } from '@solana/web3.js'
import { getConnection, newAccountWithLamports, Amount } from './lib'
import { Token } from './entities'

export async function createToken(
  programID: PublicKey,
  supply: Amount,
  decimals: number
): Promise<[Token, Account, PublicKey]> {
  const connection = await getConnection()
  const balanceNeeded =
    (await Token.getMinBalanceRentForExemptToken(connection)) +
    (await Token.getMinBalanceRentForExemptTokenAccount(connection))

  const initialOwner = await newAccountWithLamports(connection, balanceNeeded)
  const [token, initialOwnerAccount] = await Token.createNewToken(
    connection,
    initialOwner,
    supply,
    decimals,
    programID
  )

  return [token, initialOwner, initialOwnerAccount]
}

export async function createTokenAccount(token: Token): Promise<[Account, PublicKey]> {
  const connection = await getConnection()
  const balanceNeeded = await Token.getMinBalanceRentForExemptTokenAccount(connection)
  const accountOwner = await newAccountWithLamports(connection, balanceNeeded)
  const account = await token.newAccount(accountOwner)

  return [accountOwner, account]
}
