import * as sentry from '@sentry/node'
import * as logger from 'lib/logger'

export enum ErrorTypes {
  // 400 Bad Request
  INVALID_REQUEST_ERROR = 'INVALID_REQUEST_ERROR',
  // 401 Unauthorized
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  NO_PERMISSION_ERROR = 'NO_PERMISSION_ERROR',
  // 403 Forbidden
  FORBIDDEN = 'FORBIDDEN',
  // 404
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  VALIDATOR_DOES_NOT_EXISTS = 'VALIDATOR_DOES_NOT_EXISTS',
  // 408
  TIMEOUT = 'TIMEOUT',
  // 429 Too Many Requests
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  // 500 Internal Server Error
  API_ERROR = 'API_ERROR',
  // 503 Service Unavailable
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

export class APIError extends Error {
  public type: string
  public message: string
  public code: string

  constructor(type: ErrorTypes, code = '', message = '') {
    super(message)
    this.name = 'APIError'
    this.type = type || ErrorTypes.API_ERROR
    this.code = code
    this.message = message
  }
}

export function apiErrorHandler(
  callback: (ctx, type: string, code?: string, message?: string) => void
) {
  return async (ctx, next): Promise<void> => {
    try {
      await next()
    } catch (error) {
      if (error.isJoi) {
        callback(ctx, 'INVALID_REQUEST_ERROR', error.statusCode, error.message)
      } else {
        logger.error(error)
        sentry.withScope((scope) => {
          scope.addEventProcessor((event) => sentry.Handlers.parseRequest(event, ctx.request))
          sentry.captureException(error)
        })

        callback(ctx, 'API_ERROR', error.code, error.message)
      }
    }
  }
}
