import * as fs from 'fs'
import * as http from 'http'
import * as https from 'https'
import * as config from 'config'
import * as logger from 'lib/logger'
import { initApp } from './app'
import { initGraphQL, finalizeGraphQL } from './graphql'

export type Server = https.Server | http.Server
let server: Server

export async function initServer(): Promise<Server> {
  const app = await initApp()

  await initGraphQL(app)

  if (config.ssl) {
    const credential = {
      cert: fs.readFileSync(config.ssl.cert),
      key: fs.readFileSync(config.ssl.key),
    }

    logger.info(`[SSL] cert ${config.ssl.cert}`)
    logger.info(`[SSL] key ${config.ssl.key}`)

    server = https.createServer(credential, app.handler)
  } else {
    server = http.createServer(app.handler)
  }

  server.listen(config.port, () => {
    logger.info(`Listening on port ${config.port}`)
  })

  return server
}

export async function finalizeServer(): Promise<void> {
  await finalizeGraphQL()

  server.close()
}
