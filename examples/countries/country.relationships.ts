import type { RelationshipModel } from '../../src/model/model-domain'
import type { CountryModel } from './country.model'
import type { LanguageModel } from '../languages'

export interface CountryRelationships {
  langauges: RelationshipModel<CountryModel, LanguageModel, 'oneToMany'>
}
