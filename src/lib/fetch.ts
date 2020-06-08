import * as FormData from 'form-data'

export function toFormData(object: object): FormData {
  const formData = new FormData()
  for (const key of Object.keys(object)) {
    formData.append(key, object[key])
  }
  return formData
}

export function toQueryString(object: object): string {
  return Object.keys(object)
    .map((key) => `${key}=${object[key]}`)
    .join('&')
}
