import { formatToTimeZone } from 'date-fns-timezone'

export function info(...args): void {
  console.info(
    formatToTimeZone(new Date(), 'YYYY-MM-DD HH:mm:ss', { timeZone: 'Asia/Seoul' }),
    ...args
  )
}

export function warn(...args): void {
  console.warn(
    formatToTimeZone(new Date(), 'YYYY-MM-DD HH:mm:ss', { timeZone: 'Asia/Seoul' }),
    ...args
  )
}

export function error(...args): void {
  console.error(
    formatToTimeZone(new Date(), 'YYYY-MM-DD HH:mm:ss', { timeZone: 'Asia/Seoul' }),
    ...args
  )
}
