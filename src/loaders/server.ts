import * as http from 'http'
import * as logger from 'lib/logger'
import config from 'config'
import { initApp } from './app'
import { initGraphQL, finalizeGraphQL } from './graphql'

let server: http.Server

function validateConfig(): void {
  const keys = ['ORM', 'PORT', 'TERRA_URL', 'ENCRYPT_KEY']
  for (const key of keys) {
    if (!config[key]) {
      throw new Error(`process.env.${key} is missing`)
    }
  }
}

export async function initServer(): Promise<http.Server> {
  validateConfig()

  const app = await initApp()

  await initGraphQL(app)

  server = http.createServer(app.handler)

  server.listen(config.PORT, () => {
    logger.info(`Listening on port ${config.PORT}`)
  })

  return server
}

export async function finalizeServer(): Promise<void> {
  await finalizeGraphQL()

  server.close()
}
