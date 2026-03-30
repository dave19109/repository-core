import z from 'zod'

/**
 * @description The schema for the language attributes.
 * @type {z.ZodSchema<LanguageAttributes>}
 */
export const languageAttributesSchema = z.object({
  name: z.string().min(1)
})

/**
 * @description The attributes of the language.
 * @type {LanguageAttributes}
 */
export type LanguageAttributes = z.infer<typeof languageAttributesSchema>
