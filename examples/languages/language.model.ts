import { Model } from 'objection'
import type { LanguageAttributes } from './language.schema'

export abstract class LanguageModel extends Model implements LanguageAttributes {
  name: string
  isoCode: string
}
