import * as BufferLayout from 'buffer-layout'
import {
  Account,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'
import type { Connection } from '@solana/web3.js'
import { sendTransaction, TransactionResult, Amount } from 'solana'
import * as Layout from 'solana/types/layout'

/**
 * Information about a token
 */
type TokenInfo = {
  /**
   * Total supply of tokens
   */
  supply: Amount

  /**
   * Number of base 10 digits to the right of the decimal place
   */
  decimals: number
  /**
   * Owner of the token, given authority to mint new tokens
   */
  owner: null | PublicKey
}

/**
 * @private
 */
const TokenInfoLayout = BufferLayout.struct([
  BufferLayout.u8('state'),
  Layout.uint64('supply'),
  BufferLayout.nu64('decimals'),
  BufferLayout.u8('option'),
  Layout.publicKey('owner'),
  BufferLayout.nu64('padding'),
])

/**
 * Information about a token account
 */
type TokenAccountInfo = {
  /**
   * The kind of token this account holds
   */
  token: PublicKey

  /**
   * Owner of this account
   */
  owner: PublicKey

  /**
   * Amount of tokens this account holds
   */
  amount: Amount

  /**
   * The source account for the tokens.
   *
   * If `source` is null, the source is this account.
   * If `source` is not null, the `amount` of tokens in this account represent
   * an allowance of tokens that may be transferred from the source account
   */
  source: null | PublicKey

  /**
   * Original amount of tokens this delegate account was authorized to spend
   * If `source` is null, originalAmount is zero
   */
  originalAmount: Amount
}

/**
 * @private
 */
const TokenAccountInfoLayout = BufferLayout.struct([
  BufferLayout.u8('state'),
  Layout.publicKey('token'),
  Layout.publicKey('owner'),
  Layout.uint64('amount'),
  BufferLayout.nu64('sourceOption'),
  Layout.publicKey('source'),
  Layout.uint64('originalAmount'),
])

type TokenAndPublicKey = [Token, PublicKey] // This type exists to workaround an esdoc parse error

/**
 * An ERC20-like Token
 */
export class Token {
  /**
   * @private
   */
  connection: Connection

  /**
   * The public key identifying this token
   */
  token: PublicKey

  /**
   * Program Identifier for the Token program
   */
  programID: PublicKey

  /**
   * Create a Token object attached to the specific token
   *
   * @param connection The connection to use
   * @param token Public key of the token
   * @param programID Optional token programID, uses the system programID by default
   */
  constructor(connection: Connection, token: PublicKey, programID: PublicKey) {
    Object.assign(this, { connection, token, programID })
  }

  /**
   * Get the minimum balance for the token to be rent exempt
   *
   * @return Number of lamports required
   */
  static async getMinBalanceRentForExemptToken(connection: Connection): Promise<number> {
    return await connection.getMinimumBalanceForRentExemption(TokenInfoLayout.span)
  }

  /**
   * Get the minimum balance for the token account to be rent exempt
   *
   * @return Number of lamports required
   */
  static async getMinBalanceRentForExemptTokenAccount(connection: Connection): Promise<number> {
    return await connection.getMinimumBalanceForRentExemption(TokenAccountInfoLayout.span)
  }

  static async fundsToken(
    connection: Connection,
    payer: Account,
    programID: PublicKey
  ): Promise<[Token, Account]> {
    const tokenAccount: Account = new Account()
    const balanceNeeded = await Token.getMinBalanceRentForExemptToken(connection)

    const dataLayout = BufferLayout.struct([
      BufferLayout.u8('instruction'),
      Layout.uint64('supply'),
      BufferLayout.nu64('decimals'),
    ])

    let data = Buffer.alloc(1024)
    {
      const encodeLength = dataLayout.encode(
        {
          instruction: 0, // NewToken instruction
          supply: new Amount(0).toBuffer(),
          decimals: 6,
        },
        data
      )
      data = data.slice(0, encodeLength)
    }

    const transaction: Transaction = SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: tokenAccount.publicKey,
      lamports: balanceNeeded,
      space: TokenInfoLayout.span,
      programId: programID,
    })

    await sendTransaction(connection, transaction, payer, tokenAccount)

    const token = new Token(connection, tokenAccount.publicKey, programID)

    return [token, tokenAccount]
  }

  static async createNewAccount(
    connection: Connection,
    payer: Account,
    owner: PublicKey,
    token: PublicKey,
    programID: PublicKey
  ): Promise<PublicKey> {
    const account: Account = new Account()
    const balanceNeeded = await Token.getMinBalanceRentForExemptTokenAccount(connection)
    let transaction: Transaction = SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: account.publicKey,
      lamports: balanceNeeded,
      space: TokenAccountInfoLayout.span,
      programId: programID,
    })

    await sendTransaction(connection, transaction, payer, account)

    // Initialize the token account
    const keys = [
      { pubkey: account.publicKey, isSigner: true, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: token, isSigner: false, isWritable: false },
    ]

    const dataLayout = BufferLayout.struct([BufferLayout.u8('instruction')])
    const data = Buffer.alloc(dataLayout.span)
    dataLayout.encode(
      {
        instruction: 1, // NewTokenAccount instruction
      },
      data
    )

    transaction = new Transaction().add({
      keys,
      programId: programID,
      data,
    })
    await sendTransaction(connection, transaction, account)

    return account.publicKey
  }

  /**
   * Create a new Token
   *
   * @param connection The connection to use
   * @param owner User account that will own the returned Token Account
   * @param supply Total supply of the new token
   * @param decimals Location of the decimal place
   * @param programID Optional token programID, uses the system programID by default
   * @return Token object for the newly minted token, Public key of the Token Account holding the total supply of new tokens
   */
  static async createNewToken(
    connection: Connection,
    owner: Account,
    supply: Amount,
    decimals: number,
    programID: PublicKey,
    isOwned = false
  ): Promise<TokenAndPublicKey> {
    const tokenAccount = new Account()
    const token = new Token(connection, tokenAccount.publicKey, programID)
    const initialAccountPublicKey = await token.newAccount(owner, null)

    let transaction

    const dataLayout = BufferLayout.struct([
      BufferLayout.u8('instruction'),
      Layout.uint64('supply'),
      BufferLayout.nu64('decimals'),
    ])

    let data = Buffer.alloc(1024)
    {
      const encodeLength = dataLayout.encode(
        {
          instruction: 0, // NewToken instruction
          supply: supply.toBuffer(),
          decimals,
        },
        data
      )
      data = data.slice(0, encodeLength)
    }

    const balanceNeeded = await Token.getMinBalanceRentForExemptToken(connection)

    // Allocate memory for the tokenAccount account
    transaction = SystemProgram.createAccount({
      fromPubkey: owner.publicKey,
      newAccountPubkey: tokenAccount.publicKey,
      lamports: balanceNeeded,
      space: TokenInfoLayout.span,
      programId: programID,
    })

    await sendTransaction(connection, transaction, owner, tokenAccount)

    const keys = [
      { pubkey: tokenAccount.publicKey, isSigner: true, isWritable: false },
      { pubkey: initialAccountPublicKey, isSigner: false, isWritable: true },
    ]

    if (isOwned) {
      keys.push({ pubkey: owner.publicKey, isSigner: true, isWritable: false })
    }

    transaction = new Transaction().add({
      keys,
      programId: programID,
      data,
    })

    await sendTransaction(connection, transaction, owner, tokenAccount)

    return [token, initialAccountPublicKey]
  }

  /**
   * Create a new and empty token account.
   *
   * This account may then be used as a `transfer()` or `approve()` destination
   *
   * @param owner User account that will own the new token account
   * @param source If not null, create a delegate account that when authorized
   *               may transfer tokens from this `source` account
   * @return Public key of the new empty token account
   */
  async newAccount(owner: Account, source: null | PublicKey = null): Promise<PublicKey> {
    const tokenAccount = new Account()
    let transaction

    const dataLayout = BufferLayout.struct([BufferLayout.u8('instruction')])

    const data = Buffer.alloc(dataLayout.span)
    dataLayout.encode(
      {
        instruction: 1, // NewTokenAccount instruction
      },
      data
    )

    const balanceNeeded = await Token.getMinBalanceRentForExemptTokenAccount(this.connection)

    // Allocate memory for the token
    transaction = SystemProgram.createAccount({
      fromPubkey: owner.publicKey,
      newAccountPubkey: tokenAccount.publicKey,
      lamports: balanceNeeded,
      space: TokenAccountInfoLayout.span,
      programId: this.programID,
    })

    await sendTransaction(this.connection, transaction, owner, tokenAccount)

    // Initialize the token account
    const keys = [
      { pubkey: tokenAccount.publicKey, isSigner: true, isWritable: true },
      { pubkey: owner.publicKey, isSigner: false, isWritable: false },
      { pubkey: this.token, isSigner: false, isWritable: false },
    ]
    if (source) {
      keys.push({ pubkey: source, isSigner: false, isWritable: false })
    }
    transaction = new Transaction().add({
      keys,
      programId: this.programID,
      data,
    })
    await sendTransaction(this.connection, transaction, owner, tokenAccount)

    return tokenAccount.publicKey
  }

  /**
   * Retrieve token information
   */
  async tokenInfo(): Promise<TokenInfo> {
    const accountInfo = await this.connection.getAccountInfo(this.token)
    if (accountInfo == null) {
      throw new Error('failed to retrieve token info')
    }

    if (!accountInfo.owner.equals(this.programID)) {
      throw new Error(`Invalid token owner: ${JSON.stringify(accountInfo.owner)}`)
    }

    const data = Buffer.from(accountInfo.data)

    const tokenInfo = TokenInfoLayout.decode(data)
    if (tokenInfo.state !== 1) {
      throw new Error('Invalid token account data')
    }

    tokenInfo.supply = Amount.fromBuffer(tokenInfo.supply)
    if (tokenInfo.option === 0) {
      tokenInfo.owner = null
    } else {
      tokenInfo.owner = new PublicKey(tokenInfo.owner)
    }
    return tokenInfo
  }

  /**
   * Retrieve account information
   *
   * @param account Public key of the token account
   */
  async accountInfo(account: PublicKey): Promise<TokenAccountInfo> {
    const accountInfo = await this.connection.getAccountInfo(account)
    if (accountInfo == null) {
      throw new Error('failed to retrive account info')
    }

    if (!accountInfo.owner.equals(this.programID)) {
      throw new Error('Invalid token account owner')
    }

    const data = Buffer.from(accountInfo.data)
    const tokenAccountInfo = TokenAccountInfoLayout.decode(data)

    if (tokenAccountInfo.state !== 2) {
      throw new Error('Invalid token account data')
    }
    tokenAccountInfo.token = new PublicKey(tokenAccountInfo.token)
    tokenAccountInfo.owner = new PublicKey(tokenAccountInfo.owner)
    tokenAccountInfo.amount = Amount.fromBuffer(tokenAccountInfo.amount)
    if (tokenAccountInfo.sourceOption === 0) {
      tokenAccountInfo.source = null
      tokenAccountInfo.originalAmount = new Amount(0)
    } else {
      tokenAccountInfo.source = new PublicKey(tokenAccountInfo.source)
      tokenAccountInfo.originalAmount = Amount.fromBuffer(tokenAccountInfo.originalAmount)
    }

    if (!tokenAccountInfo.token.equals(this.token)) {
      throw new Error(
        `Invalid token account token: ${JSON.stringify(
          tokenAccountInfo.token
        )} !== ${JSON.stringify(this.token)}`
      )
    }
    return tokenAccountInfo
  }

  /**
   * Transfer tokens to another account
   *
   * @param owner Owner of the source token account
   * @param source Source token account
   * @param destination Destination token account
   * @param amount Number of tokens to transfer
   */
  async transfer(
    owner: Account,
    source: PublicKey,
    destination: PublicKey,
    amount: number | Amount
  ): Promise<TransactionResult> {
    return sendTransaction(
      this.connection,
      new Transaction().add(
        await this.transferInstruction(owner.publicKey, source, destination, amount)
      ),
      owner
    )
  }

  /**
   * Grant a third-party permission to transfer up the specified number of tokens from an account
   *
   * @param owner Owner of the source token account
   * @param account Public key of the token account
   * @param delegate Token account authorized to perform a transfer tokens from the source account
   * @param amount Maximum number of tokens the delegate may transfer
   */
  async approve(
    owner: Account,
    account: PublicKey,
    delegate: PublicKey,
    amount: number | Amount
  ): Promise<TransactionResult> {
    return sendTransaction(
      this.connection,
      new Transaction().add(this.approveInstruction(owner.publicKey, account, delegate, amount)),
      owner
    )
  }

  /**
   * Remove approval for the transfer of any remaining tokens
   *
   * @param owner Owner of the source token account
   * @param account Public key of the token account
   * @param delegate Token account to revoke authorization from
   */
  revoke(owner: Account, account: PublicKey, delegate: PublicKey): Promise<TransactionResult> {
    return this.approve(owner, account, delegate, 0)
  }

  /**
   * Assign a new owner to the account
   *
   * @param owner Owner of the token account
   * @param account Public key of the token account
   * @param newOwner New owner of the token account
   */
  async setOwner(
    owner: Account,
    account: PublicKey,
    newOwner: PublicKey
  ): Promise<TransactionResult> {
    return sendTransaction(
      this.connection,
      new Transaction().add(this.setOwnerInstruction(owner.publicKey, account, newOwner)),
      owner
    )
  }

  /**
   * Mint new tokens
   *
   * @param token Public key of the token
   * @param owner Owner of the token
   * @param dest Public key of the account to mint to
   * @param amount ammount to mint
   */
  async mintTo(
    owner: Account,
    token: PublicKey,
    dest: PublicKey,
    amount: number
  ): Promise<TransactionResult> {
    return sendTransaction(
      this.connection,
      new Transaction().add(this.mintToInstruction(owner, token, dest, amount)),
      owner
    )
  }

  /**
   * Burn tokens
   *
   * @param owner Public key account owner
   * @param account Account to burn tokens from
   * @param amount ammount to burn
   */
  async burn(owner: Account, account: PublicKey, amount: number): Promise<TransactionResult> {
    return sendTransaction(
      this.connection,
      new Transaction().add(await this.burnInstruction(owner, account, amount)),
      owner
    )
  }

  /**
   * Construct a Transfer instruction
   *
   * @param owner Owner of the source token account
   * @param source Source token account
   * @param destination Destination token account
   * @param amount Number of tokens to transfer
   */
  async transferInstruction(
    owner: PublicKey,
    source: PublicKey,
    destination: PublicKey,
    amount: number | Amount
  ): Promise<TransactionInstruction> {
    const accountInfo = await this.accountInfo(source)
    if (!owner.equals(accountInfo.owner)) {
      throw new Error('Account owner mismatch')
    }

    const dataLayout = BufferLayout.struct([
      BufferLayout.u8('instruction'),
      Layout.uint64('amount'),
    ])

    const data = Buffer.alloc(dataLayout.span)
    dataLayout.encode(
      {
        instruction: 2, // Transfer instruction
        amount: new Amount(amount).toBuffer(),
      },
      data
    )

    const keys = [
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: source, isSigner: false, isWritable: true },
      { pubkey: destination, isSigner: false, isWritable: true },
    ]
    if (accountInfo.source) {
      keys.push({
        pubkey: accountInfo.source,
        isSigner: false,
        isWritable: true,
      })
    }
    return new TransactionInstruction({
      keys,
      programId: this.programID,
      data,
    })
  }

  /**
   * Construct an Approve instruction
   *
   * @param owner Owner of the source token account
   * @param account Public key of the token account
   * @param delegate Token account authorized to perform a transfer tokens from the source account
   * @param amount Maximum number of tokens the delegate may transfer
   */
  approveInstruction(
    owner: PublicKey,
    account: PublicKey,
    delegate: PublicKey,
    amount: number | Amount
  ): TransactionInstruction {
    const dataLayout = BufferLayout.struct([
      BufferLayout.u8('instruction'),
      Layout.uint64('amount'),
    ])

    const data = Buffer.alloc(dataLayout.span)
    dataLayout.encode(
      {
        instruction: 3, // Approve instruction
        amount: new Amount(amount).toBuffer(),
      },
      data
    )

    return new TransactionInstruction({
      keys: [
        { pubkey: owner, isSigner: true, isWritable: false },
        { pubkey: account, isSigner: false, isWritable: true },
        { pubkey: delegate, isSigner: false, isWritable: true },
      ],
      programId: this.programID,
      data,
    })
  }

  /**
   * Construct an Revoke instruction
   *
   * @param owner Owner of the source token account
   * @param account Public key of the token account
   * @param delegate Token account authorized to perform a transfer tokens from the source account
   */
  revokeInstruction(
    owner: PublicKey,
    account: PublicKey,
    delegate: PublicKey
  ): TransactionInstruction {
    return this.approveInstruction(owner, account, delegate, 0)
  }

  /**
   * Construct a SetOwner instruction
   *
   * @param owner Owner of the token account
   * @param account Public key of the token account
   * @param newOwner New owner of the token account
   */
  setOwnerInstruction(
    owner: PublicKey,
    account: PublicKey,
    newOwner: PublicKey
  ): TransactionInstruction {
    const dataLayout = BufferLayout.struct([BufferLayout.u8('instruction')])

    const data = Buffer.alloc(dataLayout.span)
    dataLayout.encode(
      {
        instruction: 4, // SetOwner instruction
      },
      data
    )

    return new TransactionInstruction({
      keys: [
        { pubkey: owner, isSigner: true, isWritable: false },
        { pubkey: account, isSigner: false, isWritable: true },
        { pubkey: newOwner, isSigner: false, isWritable: true },
      ],
      programId: this.programID,
      data,
    })
  }

  /**
   * Construct a MintTo instruction
   *
   * @param token Public key of the token
   * @param owner Owner of the token
   * @param dest Public key of the account to mint to
   * @param amount ammount to mint
   */
  mintToInstruction(
    owner: Account,
    token: PublicKey,
    dest: PublicKey,
    amount: number
  ): TransactionInstruction {
    const dataLayout = BufferLayout.struct([
      BufferLayout.u8('instruction'),
      Layout.uint64('amount'),
    ])

    const data = Buffer.alloc(dataLayout.span)
    dataLayout.encode(
      {
        instruction: 5, // MintTo instruction
        amount: new Amount(amount).toBuffer(),
      },
      data
    )

    return new TransactionInstruction({
      keys: [
        { pubkey: owner.publicKey, isSigner: true, isWritable: false },
        { pubkey: token, isSigner: false, isWritable: true },
        { pubkey: dest, isSigner: false, isWritable: true },
      ],
      programId: this.programID,
      data,
    })
  }

  /**
   * Construct a Burn instruction
   *
   * @param owner Public key account owner
   * @param account Account to burn tokens from
   * @param amount ammount to burn
   */
  async burnInstruction(
    owner: Account,
    account: PublicKey,
    amount: number
  ): Promise<TransactionInstruction> {
    const accountInfo = await this.accountInfo(account)

    const dataLayout = BufferLayout.struct([
      BufferLayout.u8('instruction'),
      Layout.uint64('amount'),
    ])

    const data = Buffer.alloc(dataLayout.span)
    dataLayout.encode(
      {
        instruction: 6, // Burn instruction
        amount: new Amount(amount).toBuffer(),
      },
      data
    )

    const keys = [
      { pubkey: owner.publicKey, isSigner: true, isWritable: false },
      { pubkey: account, isSigner: false, isWritable: true },
      { pubkey: this.token, isSigner: false, isWritable: true },
    ]
    if (accountInfo.source) {
      keys.push({
        pubkey: accountInfo.source,
        isSigner: false,
        isWritable: true,
      })
    }

    return new TransactionInstruction({
      keys,
      programId: this.programID,
      data,
    })
  }
}
