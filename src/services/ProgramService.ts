import { Repository } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Service } from 'typedi'
import { Program } from 'orm'

@Service()
export class ProgramService {
  private program: Program

  constructor(@InjectRepository(Program) private readonly programRepo: Repository<Program>) {}

  async load(): Promise<Program> {
    this.program = await this.programRepo.findOne({ order: { createdAt: 'DESC' } })
    if (!this.program) {
      throw new Error('There are no registered programs')
    }
    return this.program
  }

  async get(): Promise<Program> {
    return this.program || (await this.load())
  }
}
