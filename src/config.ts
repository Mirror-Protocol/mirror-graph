const { ORM, SERVER_PORT, TERRA_URL, SENTRY_DSN } = process.env

const config = {
  ORM: ORM || 'default',
  PORT: SERVER_PORT ? +SERVER_PORT : 3858,
  TERRA_URL,
  SENTRY_DSN,
}

export default config
