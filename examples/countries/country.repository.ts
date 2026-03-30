import type { ModelObject } from 'objection'
import { Repository } from '../../src/repository/repository'
import type { CountryModel } from './country.model'
import type { Country } from './country'
import type { CountryRelationships } from './country.relationships'

export abstract class CountryRepository extends Repository<
  ModelObject<CountryModel>,
  Country,
  CountryModel,
  CountryRelationships
> {}
