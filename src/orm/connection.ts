import * as bluebird from 'bluebird'
import {
  Connection,
  createConnection,
  ConnectionOptions,
  ConnectionOptionsReader,
  useContainer,
  ContainerInterface,
} from 'typeorm'
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions'
import { values } from 'lodash'
import * as logger from 'lib/logger'
import * as entities from './entities'
import * as CamelToSnakeNamingStrategy from './utils/namingStrategy'

export const staticOptions = {
  supportBigNumbers: true,
  bigNumberStrings: true,
}

let connections: Connection[] = []

function initConnection(
  options: ConnectionOptions,
  container: ContainerInterface = undefined
): Promise<Connection> {
  const pgOpts = options as PostgresConnectionOptions
  logger.info(
    `Connecting to ${pgOpts.username}@${pgOpts.host}:${pgOpts.port || 5432} (${pgOpts.name || 'default'})`
  )

  container && useContainer(container)

  return createConnection({
    ...options,
    ...staticOptions,
    entities: values(entities),
    namingStrategy: new CamelToSnakeNamingStrategy(),
  })
}

export async function initORM(container: ContainerInterface = undefined): Promise<Connection[]> {
  logger.info('Initialize ORM')

  const reader = new ConnectionOptionsReader()
  const options = (await reader.all()).filter((o) => o.name !== 'migration')

  if (options.length && !options.filter((o) => o.name === 'default').length) {
    options[0]['name' as string] = 'default'
  }

  const {
    TYPEORM_HOST, TYPEORM_HOST_RO, TYPEORM_USERNAME, TYPEORM_PASSWORD, TYPEORM_DATABASE
  } = process.env

  if (TYPEORM_HOST_RO) {
    const replicaOptions = options.map((option) => ({
      ...option,
      replication: {
        master: {
          host: TYPEORM_HOST,
          username: TYPEORM_USERNAME,
          password: TYPEORM_PASSWORD,
          database: TYPEORM_DATABASE
        },
        slaves: [
          {
            host: TYPEORM_HOST_RO,
            username: TYPEORM_USERNAME,
            password: TYPEORM_PASSWORD,
            database: TYPEORM_DATABASE
          }
        ]
      }
    }))

    connections = await bluebird.map(replicaOptions, (opt) => initConnection(opt, container))
  } else {
    connections = await bluebird.map(options, (opt) => initConnection(opt, container))
  }

  return connections
}

export async function getConnectionOption(name?: string): Promise<ConnectionOptions> {
  const reader = new ConnectionOptionsReader()
  const options = await reader.all()
  const option = name ? options.find((o) => o.name === name) : options[0]
  if (!option) {
    throw new Error(`can not find connection option '${name}'`)
  }

  return option
}

export function getConnections(): Connection[] {
  return connections
}

export async function finalizeORM(): Promise<void[]> {
  return Promise.all(connections.map((c) => c.close()))
}
