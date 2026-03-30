import { ObjectionRepository } from '../../../src/adapters/objection/objection-repository'
import { CountryModel } from '../country.model'
import type { Country } from '../country'
import type { CountryRelationships } from '../country.relationships'
import type { RepositoryMapper } from '../../../src/repository/repository-adapter'
import { ObjectionCountryMapper } from './objection-country.mapper'
import type { CountryRepository } from '../country.repository'

export class ObjectionCountryRepository
  extends ObjectionRepository<CountryModel, Country, CountryRelationships>
  implements CountryRepository
{
  protected mapper: RepositoryMapper<CountryModel, Country> = new ObjectionCountryMapper()

  constructor() {
    super(CountryModel)
  }
}
