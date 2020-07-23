const {
  ORM,
  SERVER_PORT,
  TERRA_URL,
  TERRA_LCD,
  TERRA_CHAINID,
  SENTRY_DSN,
  KEYSTORE_PATH,
} = process.env

const config = {
  ORM: ORM || 'default',
  PORT: SERVER_PORT ? +SERVER_PORT : 3858,
  TERRA_URL,
  TERRA_LCD,
  TERRA_CHAINID,
  SENTRY_DSN,
  KEYSTORE_PATH: KEYSTORE_PATH || './keystore.json',
  OWNER_KEY: 'owner',
  ORACLE_KEY: 'oracle',
}

export default config
