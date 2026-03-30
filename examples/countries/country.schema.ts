import z from 'zod'
import { Continent } from './continent'

/**
 * @description The schema for the country attributes.
 * @type {z.ZodSchema<CountryAttributes>}
 */
export const countryAttributesSchema = z.object({
  name: z.string().min(1),
  isoCode: z.string().length(2),
  continent: z.enum(Continent)
})

/**
 * @description The attributes of the country.
 * @type {CountryAttributes}
 */
export type CountryAttributes = z.infer<typeof countryAttributesSchema>
