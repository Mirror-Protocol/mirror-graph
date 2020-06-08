import { format } from 'date-fns'

export function info(...args): void {
  console.info(format(new Date(), 'yyyy-MM-dd HH:mm:ss'), ...args)
}

export function warn(...args): void {
  console.warn(format(new Date(), 'yyyy-MM-dd HH:mm:ss'), ...args)
}

export function error(...args): void {
  console.error(format(new Date(), 'yyyy-MM-dd HH:mm:ss'), ...args)
}
