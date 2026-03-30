import { Model } from 'objection'
import { ObjectionClient } from '../src/adapters/objection/object-client'
import { QueryBuilder } from '../src/query-builder/query-builder'

type BuilderCall = { method: string; args: unknown[] }

class FakeLockQueryBuilder {
  calls: BuilderCall[] = []
  private awaitedValue: unknown = []

  // biome-ignore lint/suspicious/noThenProperty: Not used in this test
  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.awaitedValue).then(onfulfilled ?? undefined, onrejected ?? undefined)
  }

  forUpdate(): this {
    this.calls.push({ method: 'forUpdate', args: [] })
    return this
  }

  forShare(): this {
    this.calls.push({ method: 'forShare', args: [] })
    return this
  }

  where(...args: unknown[]): this {
    this.calls.push({ method: 'where', args })
    return this
  }

  orderBy(...args: unknown[]): this {
    this.calls.push({ method: 'orderBy', args })
    return this
  }

  limit(...args: unknown[]): this {
    this.calls.push({ method: 'limit', args })
    return this
  }

  offset(...args: unknown[]): this {
    this.calls.push({ method: 'offset', args })
    return this
  }

  first(): this {
    this.calls.push({ method: 'first', args: [] })
    return this
  }
}

interface UserModel {
  id: number
  name: string
}

let fakeBuilder = new FakeLockQueryBuilder()

class FakeUserModel extends Model {
  static override tableName = 'users'
  static override idColumn = 'id'

  declare id: number
  declare name: string

  static resetBuilder(): void {
    fakeBuilder = new FakeLockQueryBuilder()
  }

  static override query(): any {
    return fakeBuilder
  }

  static override propertyNameToColumnName(name: string): string {
    return name
  }
}

describe('ObjectionQueryConverter — pessimistic locking', () => {
  let client: ObjectionClient<any>

  beforeEach(() => {
    FakeUserModel.resetBuilder()
    client = new ObjectionClient(FakeUserModel as any)
  })

  it('applies forUpdate() when lock is "for update"', () => {
    const qb = new QueryBuilder<UserModel>().lock('for update')
    const query = client.queryConverter.toPersistenceQuery(qb.getState())
    query.createBuilder()
    expect(fakeBuilder.calls.some((c) => c.method === 'forUpdate')).toBe(true)
  })

  it('applies forShare() when lock is "for share"', () => {
    const qb = new QueryBuilder<UserModel>().lock('for share')
    const query = client.queryConverter.toPersistenceQuery(qb.getState())
    query.createBuilder()
    expect(fakeBuilder.calls.some((c) => c.method === 'forShare')).toBe(true)
  })

  it('does not apply any lock when lock is undefined', () => {
    const qb = new QueryBuilder<UserModel>()
    const query = client.queryConverter.toPersistenceQuery(qb.getState())
    query.createBuilder()
    expect(fakeBuilder.calls.some((c) => c.method === 'forUpdate' || c.method === 'forShare')).toBe(false)
  })
})
