import { Repository } from '../../src/repository/repository'
import type { LanguageModel } from './language.model'
import type { Language } from './language'

export abstract class LanguageRepository extends Repository<LanguageModel, Language> {}
