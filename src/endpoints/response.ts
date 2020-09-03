import { Context } from 'koa'
import { ErrorTypes } from 'error'

const TYPES_TO_HTTP_STATUS_CODES = {
  [ErrorTypes.INVALID_REQUEST_ERROR]: 400, // Bad Request
  [ErrorTypes.AUTHENTICATION_ERROR]: 401, // Unauthorized
  [ErrorTypes.NO_PERMISSION_ERROR]: 401,
  [ErrorTypes.FORBIDDEN]: 403, // Forbidden
  [ErrorTypes.VALIDATOR_DOES_NOT_EXISTS]: 404,
  [ErrorTypes.NOT_FOUND_ERROR]: 404,
  [ErrorTypes.TIMEOUT]: 408,
  [ErrorTypes.RATE_LIMIT_ERROR]: 429, // Too Many Requests
  [ErrorTypes.API_ERROR]: 500,
  [ErrorTypes.SERVICE_UNAVAILABLE]: 503,
}

export function success(ctx: Context, body = null): void {
  ctx.status = 200

  ctx.body = body === null ? JSON.stringify(body) : body
}

export function error(ctx: Context, type: string, code = undefined, message = undefined): void {
  ctx.status = TYPES_TO_HTTP_STATUS_CODES[type] || 500

  ctx.body = {
    type,
    code,
    message,
  }
}
