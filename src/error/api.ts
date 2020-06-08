export class ResponseError extends Error {
  public response: object | string

  constructor(response: object | string) {
    super('Response Error')

    this.response = response
  }
}
