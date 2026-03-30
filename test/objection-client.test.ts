import { Model } from 'objection'
import { ObjectionClient } from '../src/adapters/objection/object-client'
import type { RelationshipModel } from '../src/model/model-domain'
import type { QueryBuilder as QueryBuilderType } from '../src/query-builder/query-builder'
import { QueryBuilder } from '../src/query-builder/query-builder'

type BuilderCall = {
  method: string
  args: unknown[]
}

class FakeObjectionQueryBuilder {
  calls: BuilderCall[] = []
  firstValue: unknown = null
  findByIdValue: unknown = null
  pageValue: { results: unknown[]; total: number } = { results: [], total: 0 }
  resultSizeValue = 0
  private awaitedValue: unknown = []
  private readonly modifiersRegistry: Record<string, (queryBuilder: FakeObjectionQueryBuilder) => void> = {}

  // biome-ignore lint/suspicious/noThenProperty: Not used in this test
  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.awaitedValue).then(onfulfilled ?? undefined, onrejected ?? undefined)
  }

  modifiers(modifiers: Record<string, (queryBuilder: FakeObjectionQueryBuilder) => void>): this {
    Object.assign(this.modifiersRegistry, modifiers)
    return this.record('modifiers', [Object.keys(modifiers).sort()])
  }

  joinRelated(expression: string): this {
    return this.recordJoin('joinRelated', expression)
  }

  leftJoinRelated(expression: string): this {
    return this.recordJoin('leftJoinRelated', expression)
  }

  rightJoinRelated(expression: string): this {
    return this.recordJoin('rightJoinRelated', expression)
  }

  fullOuterJoinRelated(expression: string): this {
    return this.recordJoin('fullOuterJoinRelated', expression)
  }

  where(...args: unknown[]): this {
    return this.recordMaybeNested('where', args)
  }

  orWhere(...args: unknown[]): this {
    return this.recordMaybeNested('orWhere', args)
  }

  whereNot(...args: unknown[]): this {
    return this.recordMaybeNested('whereNot', args)
  }

  whereNull(...args: unknown[]): this {
    return this.record('whereNull', args)
  }

  orWhereNull(...args: unknown[]): this {
    return this.record('orWhereNull', args)
  }

  whereNotNull(...args: unknown[]): this {
    return this.record('whereNotNull', args)
  }

  orWhereNotNull(...args: unknown[]): this {
    return this.record('orWhereNotNull', args)
  }

  whereIn(...args: unknown[]): this {
    return this.record('whereIn', args)
  }

  orWhereIn(...args: unknown[]): this {
    return this.record('orWhereIn', args)
  }

  whereNotIn(...args: unknown[]): this {
    return this.record('whereNotIn', args)
  }

  orWhereNotIn(...args: unknown[]): this {
    return this.record('orWhereNotIn', args)
  }

  whereBetween(...args: unknown[]): this {
    return this.record('whereBetween', args)
  }

  orWhereBetween(...args: unknown[]): this {
    return this.record('orWhereBetween', args)
  }

  whereNotBetween(...args: unknown[]): this {
    return this.record('whereNotBetween', args)
  }

  orWhereNotBetween(...args: unknown[]): this {
    return this.record('orWhereNotBetween', args)
  }

  whereLike(...args: unknown[]): this {
    return this.record('whereLike', args)
  }

  orWhereLike(...args: unknown[]): this {
    return this.record('orWhereLike', args)
  }

  whereILike(...args: unknown[]): this {
    return this.record('whereILike', args)
  }

  orWhereILike(...args: unknown[]): this {
    return this.record('orWhereILike', args)
  }

  whereJsonHasAny(...args: unknown[]): this {
    return this.record('whereJsonHasAny', args)
  }

  orWhereJsonHasAny(...args: unknown[]): this {
    return this.record('orWhereJsonHasAny', args)
  }

  whereJsonHasAll(...args: unknown[]): this {
    return this.record('whereJsonHasAll', args)
  }

  orWhereJsonHasAll(...args: unknown[]): this {
    return this.record('orWhereJsonHasAll', args)
  }

  whereExists(...args: unknown[]): this {
    return this.record('whereExists', args)
  }

  orWhereExists(...args: unknown[]): this {
    return this.record('orWhereExists', args)
  }

  whereNotExists(...args: unknown[]): this {
    return this.record('whereNotExists', args)
  }

  orWhereNotExists(...args: unknown[]): this {
    return this.record('orWhereNotExists', args)
  }

  select(...args: unknown[]): this {
    return this.record('select', args)
  }

  sum(...args: unknown[]): this {
    return this.record('sum', args)
  }

  avg(...args: unknown[]): this {
    return this.record('avg', args)
  }

  min(...args: unknown[]): this {
    return this.record('min', args)
  }

  max(...args: unknown[]): this {
    return this.record('max', args)
  }

  count(...args: unknown[]): this {
    return this.record('count', args)
  }

  groupBy(...args: unknown[]): this {
    return this.record('groupBy', args)
  }

  distinct(...args: unknown[]): this {
    return this.record('distinct', args)
  }

  orderBy(...args: unknown[]): this {
    return this.record('orderBy', args)
  }

  limit(...args: unknown[]): this {
    return this.record('limit', args)
  }

  offset(...args: unknown[]): this {
    return this.record('offset', args)
  }

  first(): this {
    this.awaitedValue = this.firstValue
    return this.record('first', [])
  }

  findById(...args: unknown[]): this {
    this.awaitedValue = this.findByIdValue
    return this.record('findById', args)
  }

  page(...args: unknown[]): this {
    this.awaitedValue = this.pageValue
    return this.record('page', args)
  }

  resultSize(): Promise<number> {
    this.record('resultSize', [])
    return Promise.resolve(this.resultSizeValue)
  }

  insert(...args: unknown[]): this {
    this.awaitedValue = undefined
    return this.record('insert', args)
  }

  patch(...args: unknown[]): this {
    this.awaitedValue = undefined
    return this.record('patch', args)
  }

  patchAndFetchById(...args: unknown[]): this {
    this.awaitedValue = null
    return this.record('patchAndFetchById', args)
  }

  onConflict(...args: unknown[]): this {
    return this.record('onConflict', args)
  }

  merge(...args: unknown[]): this {
    this.awaitedValue = undefined
    return this.record('merge', args)
  }

  deleteById(...args: unknown[]): this {
    this.awaitedValue = undefined
    return this.record('deleteById', args)
  }

  findByIds(...args: unknown[]): this {
    return this.record('findByIds', args)
  }

  delete(...args: unknown[]): this {
    this.awaitedValue = undefined
    return this.record('delete', args)
  }

  increment(...args: unknown[]): this {
    this.awaitedValue = undefined
    return this.record('increment', args)
  }

  decrement(...args: unknown[]): this {
    this.awaitedValue = undefined
    return this.record('decrement', args)
  }

  private recordJoin(method: string, expression: string): this {
    const modifierMatch = expression.match(/^[^(]+\(([^)]+)\)$/)

    if (!modifierMatch) {
      return this.record(method, [expression])
    }

    const relatedBuilder = new FakeObjectionQueryBuilder()
    const modifierName = modifierMatch[1]
    this.modifiersRegistry[modifierName]?.(relatedBuilder)
    return this.record(method, [expression, relatedBuilder.calls])
  }

  private recordMaybeNested(method: string, args: unknown[]): this {
    if (typeof args[0] !== 'function') {
      return this.record(method, args)
    }

    const nestedBuilder = new FakeObjectionQueryBuilder()
    ;(args[0] as (queryBuilder: FakeObjectionQueryBuilder) => void)(nestedBuilder)
    return this.record(method, [nestedBuilder.calls])
  }

  private record(method: string, args: unknown[]): this {
    this.calls.push({
      method,
      args: args.map((arg) => (arg instanceof FakeObjectionQueryBuilder ? arg.calls : arg))
    })
    return this
  }
}

class FakeBuilderFactory {
  builders: FakeObjectionQueryBuilder[] = []
  private readonly setups: Array<(builder: FakeObjectionQueryBuilder) => void> = []

  queue(setup: (builder: FakeObjectionQueryBuilder) => void): void {
    this.setups.push(setup)
  }

  create(): FakeObjectionQueryBuilder {
    const builder = new FakeObjectionQueryBuilder()
    this.setups.shift()?.(builder)
    this.builders.push(builder)
    return builder
  }

  last(): FakeObjectionQueryBuilder {
    const builder = this.builders.at(-1)
    if (!builder) {
      throw new Error('No builders were created')
    }
    return builder
  }

  reset(): void {
    this.builders = []
    this.setups.length = 0
  }
}

type PostQueryModel = {
  id: number
  title: string
}

type UserRelationships = {
  posts: RelationshipModel<UserQueryModel, PostQueryModel, 'oneToMany'>
}

type UserQueryModel = {
  id: number
  firstName: string
  age: number
  salary: number
  department: string
  deletedAt: string | null
}

const userBuilderFactory = new FakeBuilderFactory()
const postBuilderFactory = new FakeBuilderFactory()

const userColumnMap: Record<string, string> = {
  id: 'id',
  firstName: 'first_name',
  age: 'age',
  salary: 'salary',
  department: 'department',
  deletedAt: 'deleted_at'
}

const postColumnMap: Record<string, string> = {
  id: 'id',
  title: 'title'
}

class PostRecord extends Model {
  id!: number
  title!: string

  static override idColumn = 'id'

  static override query(): any {
    return postBuilderFactory.create()
  }

  static override propertyNameToColumnName(propertyName: string): string {
    return postColumnMap[propertyName] ?? propertyName
  }

  static override columnNameToPropertyName(columnName: string): string {
    return Object.entries(postColumnMap).find(([, value]) => value === columnName)?.[0] ?? columnName
  }
}

class UserRecord extends Model {
  id!: number
  firstName!: string
  age!: number
  salary!: number
  department!: string
  deletedAt!: string | null

  static override idColumn = 'id'

  static override query(): any {
    return userBuilderFactory.create()
  }

  static override getRelation(name: string): any {
    if (name === 'posts') {
      return { relatedModelClass: PostRecord }
    }

    throw new Error(`Unknown relation ${name}`)
  }

  static override propertyNameToColumnName(propertyName: string): string {
    return userColumnMap[propertyName] ?? propertyName
  }

  static override columnNameToPropertyName(columnName: string): string {
    return Object.entries(userColumnMap).find(([, value]) => value === columnName)?.[0] ?? columnName
  }
}

describe('ObjectionClient', () => {
  beforeEach(() => {
    userBuilderFactory.reset()
    postBuilderFactory.reset()
  })

  it('translates query builder state into objection calls', () => {
    const client = new ObjectionClient<UserRecord, UserQueryModel>(UserRecord, { paranoidField: 'deletedAt' })
    const query = new QueryBuilder<UserQueryModel, UserRelationships>()
      .join('posts', (relationQuery) => relationQuery.where('title', 'like', 'Lead%'))
      .where('firstName', 'starts_with', 'Jo')
      .orWhere('age', 'gt', 30)
      .select(['id', 'firstName'])
      .orderBy('firstName', 'asc')
      .distinct()
      .limit(5)
      .offset(10)
      .paranoid(true)

    const persistenceQuery = client.queryConverter.toPersistenceQuery(query.getState())
    persistenceQuery.createBuilder()

    expect(userBuilderFactory.last().calls).toEqual([
      { method: 'modifiers', args: [['qb_join_posts_0']] },
      {
        method: 'joinRelated',
        args: ['posts(qb_join_posts_0)', [{ method: 'whereLike', args: ['title', 'Lead%'] }]]
      },
      { method: 'whereNull', args: ['deleted_at'] },
      { method: 'whereLike', args: ['first_name', 'Jo%'] },
      { method: 'orWhere', args: ['age', '>', 30] },
      { method: 'select', args: ['id', 'first_name'] },
      { method: 'distinct', args: [] },
      { method: 'orderBy', args: ['first_name', 'asc'] },
      { method: 'limit', args: [5] },
      { method: 'offset', args: [10] }
    ])
  })

  it('returns numeric aggregate values using stable aliases', async () => {
    userBuilderFactory.queue((builder) => {
      builder.firstValue = { sum_salary: '42' }
    })

    const client = new ObjectionClient<UserRecord, UserQueryModel>(UserRecord)
    const query = client.queryConverter.toPersistenceQuery(
      new QueryBuilder<UserQueryModel, UserRelationships>().sum('salary').getState()
    )

    await expect(client.aggregate(query)).resolves.toBe(42)
    expect(userBuilderFactory.last().calls).toEqual([
      { method: 'sum', args: ['salary as sum_salary'] },
      { method: 'first', args: [] }
    ])
  })

  it('paginates using page and derives metadata from offset and limit', async () => {
    userBuilderFactory.queue((builder) => {
      builder.pageValue = {
        results: [{ id: 1 }],
        total: 12
      }
    })

    const client = new ObjectionClient<UserRecord, UserQueryModel>(UserRecord)
    const query = client.queryConverter.toPersistenceQuery(
      new QueryBuilder<UserQueryModel, UserRelationships>().limit(5).offset(10).getState()
    )

    await expect(client.paginate(query)).resolves.toEqual({
      items: [{ id: 1 }],
      meta: {
        totalPages: 3,
        currentPage: 3,
        pageSize: 5,
        recordCount: 12
      }
    })

    expect(userBuilderFactory.last().calls).toEqual([{ method: 'page', args: [2, 5] }])
  })

  it('updates by identifier when no mutation scope is provided', async () => {
    const client = new ObjectionClient<UserRecord, UserQueryModel>(UserRecord)

    await client.update({ id: 7, firstName: 'Jane' } as Partial<UserRecord>)

    expect(userBuilderFactory.last().calls).toEqual([{ method: 'patchAndFetchById', args: [7, { firstName: 'Jane' }] }])
  })

  it('destroys multiple models by identifier', async () => {
    const client = new ObjectionClient<UserRecord, UserQueryModel>(UserRecord)

    await client.destroy([{ id: 1 }, { id: 2 }] as UserRecord[])

    expect(userBuilderFactory.last().calls).toEqual([
      { method: 'findByIds', args: [[1, 2]] },
      { method: 'delete', args: [] }
    ])
  })

  it('requires an explicit subquery model resolver for subqueries', () => {
    const client = new ObjectionClient<UserRecord, UserQueryModel>(UserRecord)
    const query = new QueryBuilder<UserQueryModel, UserRelationships>().whereExists(
      (subQuery: QueryBuilderType<PostQueryModel>) => subQuery.select(['id'])
    )
    const persistenceQuery = client.queryConverter.toPersistenceQuery(query.getState())

    expect(() => persistenceQuery.createBuilder()).toThrow(
      'ObjectionClient cannot translate subqueries without a resolveSubQueryModel option that returns the target model class'
    )
  })
})
