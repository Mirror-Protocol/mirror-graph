import * as Bluebird from 'bluebird'
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
import * as entities from './entities'
import * as CamelToSnakeNamingStrategy from './lib/CamelToSnakeNamingStrategy'

const debug = require('debug')('orm') // eslint-disable-line

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
  debug(
    `creating connection ${pgOpts.name || 'default'} to ${pgOpts.username}@${pgOpts.host}:${
      pgOpts.port || 5432
    }`
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
  const reader = new ConnectionOptionsReader()
  const options = await reader.all()

  if (options.length && !options.filter((o) => o.name === 'default').length) {
    options[0]['name' as string] = 'default'
  }

  connections = await Bluebird.map(options, (opt) => initConnection(opt, container))
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
