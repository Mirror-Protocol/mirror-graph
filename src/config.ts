const { ORM, SERVER_PORT, SOLANA_URL, TERRA_URL, SENTRY_DSN } = process.env

const config = {
  ORM: ORM || 'default',
  PORT: SERVER_PORT ? +SERVER_PORT : 3858,
  SOLANA_URL,
  TERRA_URL,
  SENTRY_DSN,
}

export default config
