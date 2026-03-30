import { QueryBuilder } from '../src/query-builder/query-builder'

interface User {
  id: number
  name: string
}

describe('QueryBuilder.lock()', () => {
  it('stores for update in state', () => {
    const qb = new QueryBuilder<User>()
    const result = qb.lock('for update')
    expect(result.getState().lock).toBe('for update')
  })

  it('stores for share in state', () => {
    const qb = new QueryBuilder<User>()
    const result = qb.lock('for share')
    expect(result.getState().lock).toBe('for share')
  })

  it('does not mutate the original builder', () => {
    const qb = new QueryBuilder<User>()
    qb.lock('for update')
    expect(qb.getState().lock).toBeUndefined()
  })

  it('composes with where', () => {
    const qb = new QueryBuilder<User>()
    const result = qb.where('id', 'eq', 1).lock('for update')
    expect(result.getState().lock).toBe('for update')
    expect(result.getState().where).toHaveLength(1)
  })
})
