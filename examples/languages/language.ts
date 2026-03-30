import type { LanguageAttributes } from './language.schema'
import {Aggregate} from "@tackpay/ddd"

export type LanguageCtr = LanguageAttributes

export class Language extends Aggregate<LanguageAttributes> {

  private constructor(props: LanguageCtr) {
    super(props)
  }

  static create(props: LanguageCtr): Language {
    return new Language(props)
  }
}
