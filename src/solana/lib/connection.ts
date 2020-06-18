import { Connection } from '@solana/web3.js'
import * as semver from 'semver'
import * as logger from 'lib/logger'
import { url } from './url'

let connection

export async function getConnection(): Promise<Connection> {
  if (connection) return connection

  let newConnection = new Connection(url)
  const version = await newConnection.getVersion()

  // commitment params are only supported >= 0.21.0
  const solanaCoreVersion = version['solana-core'].split(' ')[0]
  if (semver.gte(solanaCoreVersion, '0.21.0')) {
    newConnection = new Connection(url, 'recent')
  }

  // require-atomic-updates
  connection = newConnection
  logger.info('Connection to cluster established:', url, version)

  return connection
}
