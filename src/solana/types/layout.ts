import * as BufferLayout from 'buffer-layout'

/**
 * Layout for a public key
 */
export const publicKey = (property = 'publicKey'): object => BufferLayout.blob(32, property)

export const symbol = (property = 'symbol'): object => BufferLayout.blob(8, property)

/**
 * Layout for a 64bit unsigned value
 */
export const uint64 = (property = 'uint64'): object => BufferLayout.blob(8, property)

/**
 * Layout for a Rust String type
 */
export const rustString = (property = 'string'): string => {
  const rsl = BufferLayout.struct(
    [
      BufferLayout.u32('length'),
      BufferLayout.u32('lengthPadding'),
      BufferLayout.blob(BufferLayout.offset(BufferLayout.u32(), -8), 'chars'),
    ],
    property
  )
  const _decode = rsl.decode.bind(rsl)
  const _encode = rsl.encode.bind(rsl)

  rsl.decode = (buffer, offset): string => {
    const data = _decode(buffer, offset)
    return data.chars.toString('utf8')
  }

  rsl.encode = (str, buffer, offset): string => {
    const data = {
      chars: Buffer.from(str, 'utf8'),
    }
    return _encode(data, buffer, offset)
  }

  return rsl
}
