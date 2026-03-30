import { Aggregate } from '@tackpay/ddd'
import type { Language } from '../languages'
import type { CountryAttributes } from './country.schema'

/**
 * @description The properties of the Country.
 * @template Props - The properties of the Country.
 * @param props - The properties to create the Country.
 * @returns A new Country instance.
 */
interface CountryProps extends CountryAttributes {
  /**
   * @description The languages of the country.
   * @type {Language[]}
   */
  langauges?: Language[] | null
}

/**
 * @description The constructor for the Country.
 * @template Props - The properties of the Country.
 * @param props - The properties to create the Country.
 * @returns A new Country instance.
 */
export type CountryCtr = CountryProps

/**
 * @description The Country class.
 * @extends Resource<CountryProps>
 * @implements {ResourceTypeLock}
 */
export class Country extends Aggregate<CountryProps> {

  private constructor(props: CountryCtr) {
    super(props)
  }

  static create(props: CountryCtr): Country {
    return new Country(props)
  }

}
