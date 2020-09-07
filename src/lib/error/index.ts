import * as sentry from '@sentry/node'
import * as logger from 'lib/logger'

export function init(
  opts: {
    sentryDsn?: string
  } = undefined
): void {
  opts?.sentryDsn && sentry.init({ dsn: opts.sentryDsn })

  process.on('unhandledRejection', (error) => {
    logger.error(error)

    sentry.withScope((scope) => {
      scope.setLevel(sentry.Severity.Critical)
      sentry.captureException(error)
    })
  })
}

export function errorHandler(error?: object): void {
  if (error) {
    logger.error(error)
    sentry.captureException(error)
  }
}

export * from './api'
