import * as Limiter from 'koa-ratelimit/limiter/memory'
import * as RedisLimiter from 'koa-ratelimit/limiter/redis'
import * as ms from 'ms'
import { gql } from 'apollo-server-koa'

export interface OperationOption {
  type?: string
  name?: string
  duration: number
  max: number
  whitelist?: (id) => boolean
  blacklist?: (id) => boolean
}

export interface LimitOption {
  driver?: string
  db: any
  id?: (ctx) => string
  errorMessage?: string
  throw?: boolean
  status?: number
  disableHeader?: boolean
  headers?: {
    remaining?: string
    reset: string
    total: string
  }
  operations?: OperationOption[]
}

const firstOperationDefinition = (ast) => ast.definitions[0]

const firstFieldValueNameFromOperation = (operationDefinition) =>
  operationDefinition.selectionSet.selections[0].name.value

function findOperationOption(
  ctx,
  operationOptMap: Map<string | undefined, OperationOption>
): OperationOption {
  let operationName = ctx.request.body?.operationName
  if (!operationName && ctx.request.body?.query) {
    try {
      const parsedQuery = gql(ctx.request.body.query)
      operationName = firstFieldValueNameFromOperation(firstOperationDefinition(parsedQuery))
    } catch (e) {
      /*ignore*/
    }
  }

  return operationOptMap.get(operationName) || operationOptMap.get(undefined)
}

/**
 *
 * Expose `middleware()`.
 * Initialize ratelimit middleware with the given `opts`
 *
 * @param {LimitOption} opts
 * - `driver` redis or memory [redis]
 * - `db` database connection if redis. Map instance if memory
 * - `id` id to compare requests [ip]
 * - `errorMessage` limit body message
 * - `throw` call ctx.throw if true [false]
 * - `status` limit http status code [429]
 * - `disableHeader` whether to include custom headers [false]
 *
 * `headers` custom header names
 * - `remaining` remaining number of requests ['X-RateLimit-Remaining']
 * - `reset` reset timestamp ['X-RateLimit-Reset']
 * - `total` total number of requests ['X-RateLimit-Limit']
 *
 * `operations` graphql operation limits
 * - `name` graphql operation name
 * - `duration` limit duration in milliseconds [1 hour]
 * - `max` max requests per `id` [2500]
 * - `whitelist` whitelist function [false]
 * - `blacklist` blacklist function [false]
 *
 * @return {Function}
 * @api public
 */
export function ratelimit(opts: LimitOption) {
  const defaultOperationOpts: OperationOption = {
    duration: 60 * 60 * 1000, // 1 hour
    max: 2500,
  }

  const defaultLimitOpts = {
    driver: 'memory',
    id: (ctx) => ctx.ip,
    headers: {
      remaining: 'X-RateLimit-Remaining',
      reset: 'X-RateLimit-Reset',
      total: 'X-RateLimit-Limit',
    },
    operations: [defaultOperationOpts],
  }

  opts = { ...defaultLimitOpts, ...opts }

  const operationOptMap = new Map<string, OperationOption>(
    opts.operations.map((op) => [op.name, op])
  )

  return async function middleware(ctx, next) {
    const id = opts.id(ctx)
    const operationOpts = findOperationOption(ctx, operationOptMap) || defaultOperationOpts

    // check blacklist
    const blacklisted =
      typeof operationOpts.blacklist === 'function' && (await operationOpts.blacklist(id))
    if (blacklisted) ctx.throw(403, 'Forbidden')

    // check whitelist
    const whitelisted =
      typeof operationOpts.whitelist === 'function' && (await operationOpts.whitelist(id))
    if (whitelisted) return await next()

    // initialize limiter
    const namespace = operationOpts.name ? `limit:${operationOpts.name}` : 'limit'
    const { driver, db } = opts

    let limiter
    if (driver === 'memory') {
      limiter = new Limiter({ id, db, namespace, ...operationOpts })
    } else if (driver === 'redis') {
      limiter = new RedisLimiter({ id, db, namespace, ...operationOpts })
    } else {
      throw new Error(`invalid driver. expecting memory or redis, got ${driver}`)
    }

    const limit = await limiter.get()

    // add header fields if enabled
    let headers = {}
    const disableHeader = opts.disableHeader || false
    if (!disableHeader) {
      const { remaining, reset, total } = opts.headers

      headers = {
        [remaining]: limit.remaining > 0 ? limit.remaining - 1 : 0,
        [reset]: limit.reset,
        [total]: limit.total,
      }
      ctx.set(headers)
    }

    // check remaining
    if (limit.remaining) return await next()

    const delta = (limit.reset * 1000 - Date.now()) | 0
    const after = (limit.reset - Date.now() / 1000) | 0

    ctx.set('Retry-After', after)
    ctx.status = opts.status || 429
    ctx.body = {
      message: opts.errorMessage || `rate limit exceeded, retry in ${ms(delta, { long: true })}.`,
    }

    if (opts.throw) {
      ctx.throw(ctx.status, ctx.body, { headers })
    }
  }
}
