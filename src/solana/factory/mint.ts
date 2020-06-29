import { PublicKey, Account } from '@solana/web3.js'
import { Minter, Token, Amount, getConnection, newAccountWithAirdrop } from 'solana'

export async function createMinter(
  collateralTokenProgramId: PublicKey,
  collateralToken: PublicKey,
  depositTokenProgramId: PublicKey,
  depositToken: PublicKey,
  decimals: number,
  mintCapacity: Amount,
  whitelistThreshold: Amount,
  programId: PublicKey
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
    collateralTokenProgramId,
    collateralToken,
    depositTokenProgramId,
    depositToken,
    decimals,
    mintCapacity,
    whitelistThreshold,
    programId
  )

  return [minter, accountOwner]
}

export async function createDeposit(
  minter: Minter,
  depositTokenOwner: Account,
  depositTokenSource: PublicKey,
  boardKey: PublicKey,
  amount: Amount
): Promise<[Account, PublicKey]> {
  const connection = await getConnection()
  const balanceNeeded = 1000000 + (await Minter.getMinBalanceRentForExemptMinter(connection))

  const depositOwner = await newAccountWithAirdrop(connection, balanceNeeded)

  return [
    depositOwner,
    await minter.deposit(
      depositOwner,
      null,
      depositTokenOwner,
      depositTokenSource,
      boardKey,
      amount
    ),
  ]
}

export async function createMintPosition(
  minter: Minter,
  collateralTokenOwner: Account,
  collateralTokenSource: PublicKey,
  assetTokenProgramId: PublicKey,
  assetTokenDest: PublicKey,
  boardKey: PublicKey,
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
      assetTokenProgramId,
      assetTokenDest,
      boardKey,
      amount
    ),
  ]
}
