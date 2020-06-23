import * as crypto from 'crypto'

const iv = '12237afa2e44151f'

export function generateKey(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function encrypt(value: string): string {
  if (!process.env.ENCRYPT_KEY) {
    throw new Error('ENCRYPT_KEY is required')
  }
  const cipher = crypto.createCipheriv('aes-256-cbc', process.env.ENCRYPT_KEY, iv)

  let result = cipher.update(value, 'utf8', 'base64')
  result += cipher.final('base64')

  return result
}

export function decrypt(source: string): string {
  if (!process.env.ENCRYPT_KEY) {
    throw new Error('ENCRYPT_KEY is required')
  }
  const decipher = crypto.createDecipheriv('aes-256-cbc', process.env.ENCRYPT_KEY, iv)

  let result = decipher.update(source, 'base64', 'utf8')
  result += decipher.final('utf8')

  return result
}
