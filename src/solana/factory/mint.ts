import { PublicKey, Account } from '@solana/web3.js'
import { Minter, Token, Amount, SymbolBuffer, getConnection, newAccountWithAirdrop } from 'solana'

export async function createMinter(
  collateralTokenProgramID: PublicKey,
  collateralToken: PublicKey,
  depositTokenProgramID: PublicKey,
  depositToken: PublicKey,
  decimals: number,
  mintCapacity: Amount,
  whitelistThreshold: Amount,
  programID: PublicKey
): Promise<[Minter, Account]> {
  const connection = await getConnection()
  const balanceNeeded =
    10 *
    (1000000 +
      (await Minter.getMinBalanceRentForExemptMinter(connection)) +
      (await Token.getMinBalanceRentForExemptToken(connection)) +
      3 * (await Token.getMinBalanceRentForExemptTokenAccount(connection)))

  const accountOwner = await newAccountWithAirdrop(connection, balanceNeeded)
  const minter = await Minter.createMinter(
    connection,
    accountOwner,
    collateralTokenProgramID,
    collateralToken,
    depositTokenProgramID,
    depositToken,
    decimals,
    mintCapacity,
    whitelistThreshold,
    programID
  )

  return [minter, accountOwner]
}

export async function createDeposit(
  minter: Minter,
  depositTokenOwner: Account,
  depositTokenSource: PublicKey,
  symbol: SymbolBuffer,
  amount: Amount
): Promise<[Account, PublicKey]> {
  const connection = await getConnection()
  const balanceNeeded = 1000000 + (await Minter.getMinBalanceRentForExemptMinter(connection))
  const depositOwner = await newAccountWithAirdrop(connection, balanceNeeded)

  return [
    depositOwner,
    await minter.deposit(depositOwner, null, depositTokenOwner, depositTokenSource, symbol, amount),
  ]
}

export async function createMintPosition(
  minter: Minter,
  collateralTokenOwner: Account,
  collateralTokenSource: PublicKey,
  assetTokenProgramID: PublicKey,
  assetTokenDest: PublicKey,
  symbol: SymbolBuffer,
  amount: Amount
): Promise<[Account, PublicKey]> {
  const connection = await getConnection()
  const balanceNeeded = 1000000 + (await Minter.getMinBalanceRentForExemptMinter(connection))
  const poisitionOwner = await newAccountWithAirdrop(connection, balanceNeeded)

  return [
    poisitionOwner,
    await minter.mint(
      poisitionOwner,
      null,
      collateralTokenOwner,
      collateralTokenSource,
      assetTokenProgramID,
      assetTokenDest,
      symbol,
      amount
    ),
  ]
}
