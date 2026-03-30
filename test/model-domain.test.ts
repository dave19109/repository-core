import type { ModelAttributeField, ModelAttributeFieldNumber, ModelAttributeValue } from '../src/model/model-domain'

type User = {
  name: string
  age: number
}

type OrmUser = { id: number; email: string; active: boolean }

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
})
