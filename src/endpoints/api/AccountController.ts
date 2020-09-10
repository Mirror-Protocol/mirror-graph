import { KoaController, Get, Controller, Validate, Validator } from 'koa-joi-controllers'
import Container from 'typedi'
import { AccountService } from 'services'
import { success } from 'lib/response'
import { ErrorTypes, HttpStatusCodes } from 'lib/error'

const Joi = Validator.Joi

@Controller('/accounts')
export default class AccountController extends KoaController {
  get accountService(): AccountService {
    return Container.get(AccountService)
  }

  @Get('/:address/balances/:symbol')
  @Validate({
    params: { address: Joi.string().required(), symbol: Joi.string().required() },
    failure: HttpStatusCodes[ErrorTypes.INVALID_REQUEST_ERROR],
  })
  async getAccountBalance(ctx): Promise<void> {
    const { address, symbol } = ctx.params

    success(ctx, await this.accountService.getBalance(address, symbol))
  }

  @Get('/:address/balances')
  @Validate({
    params: { address: Joi.string().required() },
    failure: HttpStatusCodes[ErrorTypes.INVALID_REQUEST_ERROR],
  })
  async getAccountBalances(ctx): Promise<void> {
    const { address } = ctx.params

    success(ctx, await this.accountService.getBalances(address))
  }
}
