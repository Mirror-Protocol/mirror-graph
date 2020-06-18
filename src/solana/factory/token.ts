import { PublicKey, Account } from '@solana/web3.js'
import { getConnection, newAccountWithAirdrop, Token } from 'solana'

export async function createToken(programID: PublicKey, decimals: number): Promise<Token> {
  const connection = await getConnection()
  const balanceNeeded =
    (await Token.getMinBalanceRentForExemptToken(connection)) +
    (await Token.getMinBalanceRentForExemptTokenAccount(connection))

  const tokenOwner = await newAccountWithAirdrop(connection, balanceNeeded)
  const token = await Token.createNewToken(connection, tokenOwner, decimals, programID)

  return token
}

export async function createTokenAccount(token: Token): Promise<[Account, PublicKey]> {
  const connection = await getConnection()
  const balanceNeeded = await Token.getMinBalanceRentForExemptTokenAccount(connection)
  const accountOwner = await newAccountWithAirdrop(connection, balanceNeeded)
  const account = await token.newAccount(accountOwner)

  return [accountOwner, account]
}
