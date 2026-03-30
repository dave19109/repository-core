import type { ModelObject } from 'objection'
import type { CountryModel } from '../examples/countries/country.model'
import type { ModelAttributeField, ModelAttributeFieldNumber, ModelAttributeValue } from '../src/model/model-domain'

type User = {
  name: string
  age: number
}

type OrmUser = { id: number; email: string; active: boolean }

/** Compile-time: these keys must not appear in attribute field unions for Objection models. */
type AssertNotInUnion<Key extends string, Union> = Key extends Union ? never : true
type _ExcludesObjectionMetaKeys = AssertNotInUnion<
  'QueryBuilderType',
  ModelAttributeField<CountryModel> | ModelAttributeField<ModelObject<CountryModel>>
>
type _ExcludesModelClassKey = AssertNotInUnion<
  '$modelClass',
  ModelAttributeField<CountryModel> | ModelAttributeField<ModelObject<CountryModel>>
>
type _ExcludesRelationNav = AssertNotInUnion<
  'languages',
  ModelAttributeField<CountryModel> | ModelAttributeField<ModelObject<CountryModel>>
>

describe('Model typing', () => {
  it('should infer attribute fields from plain object types', () => {
    const field: ModelAttributeField<User> = 'name'
    const value: ModelAttributeValue<User, 'age'> = 30

    expect(field).toBe('name')
    expect(value).toBe(30)
  })

  it('should infer ORM attribute fields from plain object types', () => {
    const field: ModelAttributeField<OrmUser> = 'email'
    const value: ModelAttributeValue<OrmUser, 'active'> = true

    expect(field).toBe('email')
    expect(value).toBe(true)
  })

  it('should infer only numeric attribute fields', () => {
    const userNumeric: ModelAttributeFieldNumber<User> = 'age'
    const ormNumeric: ModelAttributeFieldNumber<OrmUser> = 'id'

    expect(userNumeric).toBe('age')
    expect(ormNumeric).toBe('id')
  })

  it('excludes Objection framework keys and relation navigations from attribute fields (types)', () => {
    const checks: readonly [_ExcludesObjectionMetaKeys, _ExcludesModelClassKey, _ExcludesRelationNav] = [
      true,
      true,
      true
    ]
    expect(checks.every(Boolean)).toBe(true)
  })
})
