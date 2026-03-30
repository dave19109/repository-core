import { RepositoryMapper } from '../../../src/repository/repository-adapter'
import { CountryModel } from '../country.model'
import { Country } from '../country'

export class ObjectionCountryMapper extends RepositoryMapper<CountryModel, Country> {
  toDomain(persistence: CountryModel): Country {
    return Country.create({
      ...persistence.toJSON()
    })
  }

  toPersistence(domain: Country): CountryModel {
    return CountryModel.fromJson(domain.toObject())
  }
}
