import { snakeCase, camelCase, isObject, isArray } from 'lodash'

// eslint-disable-next-line
export function toSnakeCase(obj: any): any {
  if (isObject(obj) && !isArray(obj)) {
    const converted = {}
    Object.keys(obj).forEach((key) => {
      converted[snakeCase(key)] = toSnakeCase(obj[key])
    })
    return converted
  }

  return obj
}

// eslint-disable-next-line
export function toCamelCase(obj: any): any {
  if (isObject(obj) && !isArray(obj)) {
    const converted = {}
    Object.keys(obj).forEach((key) => {
      converted[camelCase(key)] = toCamelCase(obj[key])
    })
    return converted
  }

  return obj
}
