import { InjectRepository } from 'typeorm-typedi-extensions'
import { Repository } from 'typeorm'
import { Service } from 'typedi'
import { Account, PublicKey } from '@solana/web3.js'
import { Asset, Program } from 'orm'
import { Token, getConnection, Oracle } from 'solana'
import { encryptBuffer, decryptBuffer } from 'lib/crypto'

@Service()
export class AssetService {
  constructor(@InjectRepository(Asset) private readonly assetRepo: Repository<Asset>) {}

  async create(
    symbol: string,
    program: Program,
    assetToken: Token,
    boardKey: PublicKey,
    oracle: Oracle
  ): Promise<Asset> {
    return this.assetRepo.save({
      program,
      symbol,
      assetToken: {
        key: assetToken.token.toBase58(),
        ownerSecretKey: encryptBuffer(assetToken.tokenOwner.secretKey),
      },
      boardKey: boardKey.toBase58(),
      oracle: {
        key: oracle.oracle.toBase58(),
        ownerSecretKey: encryptBuffer(oracle.owner.secretKey),
      },
    })
  }

  async get(symbol: string): Promise<Asset> {
    return this.assetRepo.findOne({ symbol })
  }

  async getAssetToken(symbol: string): Promise<Token> {
    const asset: Asset = await this.get(symbol)
    return new Token(
      await getConnection(),
      new PublicKey(asset.assetToken.key),
      new Account(decryptBuffer(asset.assetToken.ownerSecretKey)),
      new PublicKey(asset.program.programIds.token)
    )
  }

  async getOracle(symbol: string): Promise<Oracle> {
    const asset: Asset = await this.get(symbol)
    return new Oracle(
      await getConnection(),
      new PublicKey(asset.oracle.key),
      new Account(decryptBuffer(asset.oracle.ownerSecretKey)),
      new PublicKey(asset.program.programIds.oracle)
    )
  }
}
