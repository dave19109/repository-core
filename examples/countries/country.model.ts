import { Model } from 'objection'
import type { LanguageModel } from '../languages'
import type { Continent } from './continent'
import type { CountryAttributes } from './country.schema'

/**
 * @description The model for the country.
 * @extends ResourceModel
 * @implements CountryAttributes
 */
export class CountryModel extends Model implements CountryAttributes {
  name: string
  isoCode: string
  continent: Continent

  languages?: LanguageModel[] | null
}
