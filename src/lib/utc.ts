export function getUTCDate(date: Date = new Date()): Date {
  return new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000)
}
