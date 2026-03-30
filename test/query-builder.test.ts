import type { RelationshipModel } from '../src/model/model-domain'
import { QueryBuilder } from '../src/query-builder/query-builder'

type PostModel = { id: number; title: string }

type UserRelationships = {
  posts: RelationshipModel<UserModel, PostModel, 'oneToMany'>
}

type UserModel = {
  age: number
  name: string
  salary: number
  department: string
}

describe('QueryBuilder', () => {
  it('should support full method chaining across all modules', () => {
    const result = new QueryBuilder<UserModel, UserRelationships>()
      .where('name', 'eq', 'John')
      .join('posts')
      .select(['name', 'age'])
      .sum('salary')
      .groupBy('department')
      .orderBy('age', 'asc')
      .distinct()
      .paranoid(true)

    expect(result.getState().where).toEqual([{ field: 'name', operator: 'eq', value: 'John', logicalOperator: 'and' }])
    expect(result.getState().joins).toEqual([{ type: 'inner', relationship: 'posts' }])
    expect(result.getState().select).toEqual(['name', 'age'])
    expect(result.getState().sort).toEqual([{ field: 'age', direction: 'asc' }])
    expect(result.getState().aggregations).toEqual([{ fn: 'sum', field: 'salary' }])
    expect(result.getState().groupBy).toEqual(['department'])
    expect(result.getState().distinct).toBe(true)
    expect(result.getState().paranoid).toBe(true)
  })

  it('should preserve immutability across chains', () => {
    const base = new QueryBuilder<UserModel, UserRelationships>()
    const withWhere = base.where('name', 'eq', 'John')
    const withJoin = withWhere.join('posts')
    const withParanoid = withJoin.paranoid(true)

    expect(base.getState().where).toEqual([])
    expect(base.getState().joins).toEqual([])
    expect(base.getState().paranoid).toBe(false)
    expect(withWhere.getState().where).toHaveLength(1)
    expect(withWhere.getState().joins).toEqual([])
    expect(withJoin.getState().where).toHaveLength(1)
    expect(withJoin.getState().joins).toHaveLength(1)
    expect(withJoin.getState().paranoid).toBe(false)
    expect(withParanoid.getState().paranoid).toBe(true)
  })

  it('should support orWhere chaining', () => {
    const result = new QueryBuilder<UserModel, UserRelationships>().where('name', 'eq', 'John').orWhere('age', 'gt', 30)

    expect(result.getState().where).toHaveLength(2)
    expect(result.getState().where[1].logicalOperator).toBe('or')
  })

  it('should support multiple aggregations', () => {
    const result = new QueryBuilder<UserModel, UserRelationships>().sum('salary').avg('age').count()

    expect(result.getState().aggregations).toHaveLength(3)
  })

  it('should support whereBetween and whereIn', () => {
    const result = new QueryBuilder<UserModel, UserRelationships>()
      .whereBetween('age', [18, 65])
      .whereIn('department', ['IT', 'HR'])

    expect(result.getState().where).toHaveLength(2)
    const w0 = result.getState().where[0]
    const w1 = result.getState().where[1]
    expect('operator' in w0 && w0.operator).toBe('between')
    expect('operator' in w1 && w1.operator).toBe('in')
  })

  it('should support field-based and exists subqueries in where clauses', () => {
    const result = new QueryBuilder<UserModel, UserRelationships>()
      .whereInSubQuery('age', (query: QueryBuilder<PostModel>) => query.select(['id']).where('title', 'like', 'Lead%'))
      .orWhereExists((query: QueryBuilder<PostModel>) => query.select(['id']).where('id', 'gt', 0).limit(1))

    expect(result.getState().where).toHaveLength(2)

    const subQueryIn = result.getState().where[0]
    expect(subQueryIn).toMatchObject({
      type: 'subQuery',
      field: 'age',
      operator: 'in',
      logicalOperator: 'and'
    })

    if ('type' in subQueryIn && subQueryIn.type === 'subQuery' && 'field' in subQueryIn) {
      expect(subQueryIn.query.select).toEqual(['id'])
      expect(subQueryIn.query.where).toEqual([
        { field: 'title', operator: 'like', value: 'Lead%', logicalOperator: 'and' }
      ])
    }

    const existsSubQuery = result.getState().where[1]
    expect(existsSubQuery).toMatchObject({
      type: 'subQuery',
      operator: 'exists',
      logicalOperator: 'or'
    })

    if ('type' in existsSubQuery && existsSubQuery.type === 'subQuery' && !('field' in existsSubQuery)) {
      expect(existsSubQuery.query.limit).toBe(1)
      expect(existsSubQuery.query.where).toEqual([{ field: 'id', operator: 'gt', value: 0, logicalOperator: 'and' }])
    }
  })

  it('should support subquery sugar in where and orWhere', () => {
    const result = new QueryBuilder<UserModel, UserRelationships>()
      .where('age', 'in', (query: QueryBuilder<PostModel>) => query.select(['id']).where('id', 'gt', 10))
      .orWhere('age', 'not_in', new QueryBuilder<PostModel>().select(['id']).where('id', 'lt', 3))

    expect(result.getState().where).toHaveLength(2)
    expect(result.getState().where[0]).toMatchObject({
      type: 'subQuery',
      field: 'age',
      operator: 'in',
      logicalOperator: 'and'
    })
    expect(result.getState().where[1]).toMatchObject({
      type: 'subQuery',
      field: 'age',
      operator: 'not_in',
      logicalOperator: 'or'
    })
  })

  it('should clone subquery state when reusing a built query', () => {
    const subQuery = new QueryBuilder<PostModel>().select(['id']).where('id', 'gt', 5)
    const result = new QueryBuilder<UserModel, UserRelationships>().whereNotInSubQuery('age', subQuery)
    const mutatedSubQuery = subQuery.limit(1)

    const clause = result.getState().where[0]
    expect(mutatedSubQuery.getState().limit).toBe(1)

    if ('type' in clause && clause.type === 'subQuery' && 'field' in clause) {
      expect(clause.query.limit).toBeUndefined()
      expect(clause.query.select).toEqual(['id'])
      expect(clause.query.where).toEqual([{ field: 'id', operator: 'gt', value: 5, logicalOperator: 'and' }])
      expect(clause.operator).toBe('not_in')
    }
  })

  it('should support left join', () => {
    const result = new QueryBuilder<UserModel, UserRelationships>().leftJoin('posts')

    expect(result.getState().joins).toEqual([{ type: 'left', relationship: 'posts' }])
  })

  it('should support join subqueries built from relationship target callbacks', () => {
    const result = new QueryBuilder<UserModel, UserRelationships>().join('posts', (query) =>
      query.where('title', 'like', 'Lead%').select(['id', 'title']).limit(5)
    )

    expect(result.getState().joins).toHaveLength(1)
    expect(result.getState().joins[0]).toMatchObject({
      type: 'inner',
      relationship: 'posts'
    })

    const join = result.getState().joins[0]
    expect(join?.query).toBeDefined()
    expect(join?.query?.select).toEqual(['id', 'title'])
    expect(join?.query?.limit).toBe(5)
    expect(join?.query?.where).toEqual([{ field: 'title', operator: 'like', value: 'Lead%', logicalOperator: 'and' }])
  })

  it('should clone join subquery state when reusing a built query', () => {
    const joinQuery = new QueryBuilder<PostModel>().where('title', 'like', 'Lead%').limit(2)
    const result = new QueryBuilder<UserModel, UserRelationships>().leftJoin('posts', joinQuery)
    const mutatedJoinQuery = joinQuery.limit(1)

    expect(mutatedJoinQuery.getState().limit).toBe(1)

    const join = result.getState().joins[0]
    expect(join).toMatchObject({
      type: 'left',
      relationship: 'posts'
    })
    expect(join?.query?.limit).toBe(2)
    expect(join?.query?.where).toEqual([{ field: 'title', operator: 'like', value: 'Lead%', logicalOperator: 'and' }])
  })

  it('should support whereNull and whereNotNull', () => {
    const result = new QueryBuilder<UserModel, UserRelationships>().whereNull('name').whereNotNull('age')

    expect(result.getState().where).toHaveLength(2)
    const n0 = result.getState().where[0]
    const n1 = result.getState().where[1]
    expect('operator' in n0 && n0.operator).toBe('is_null')
    expect('operator' in n1 && n1.operator).toBe('is_not_null')
  })

  it('should allow join → where → select → aggregate → groupBy → orderBy → distinct', () => {
    const result = new QueryBuilder<UserModel, UserRelationships>()
      .join('posts')
      .where('age', 'gt', 30)
      .select(['name', 'age'])
      .sum('salary')
      .groupBy('department')
      .orderBy('age', 'asc')
      .distinct()

    expect(result.getState().joins).toHaveLength(1)
    expect(result.getState().where).toHaveLength(1)
    expect(result.getState().select).toEqual(['name', 'age'])
    expect(result.getState().aggregations).toHaveLength(1)
    expect(result.getState().groupBy).toEqual(['department'])
    expect(result.getState().sort).toHaveLength(1)
    expect(result.getState().distinct).toBe(true)
  })

  it('should allow chaining multiple aggregates after each other', () => {
    const result = new QueryBuilder<UserModel, UserRelationships>()
      .max('age')
      .min('age')
      .sum('salary')
      .avg('salary')
      .count()

    expect(result.getState().aggregations).toHaveLength(5)
  })

  it('should allow aggregate → groupBy → orderBy → distinct', () => {
    const result = new QueryBuilder<UserModel, UserRelationships>()
      .aggregate('sum', 'salary')
      .groupBy('department')
      .orderBy('department', 'asc')
      .distinct()

    expect(result.getState().aggregations).toHaveLength(1)
    expect(result.getState().groupBy).toEqual(['department'])
    expect(result.getState().sort).toHaveLength(1)
    expect(result.getState().distinct).toBe(true)
  })

  it('should allow orderBy → distinct as terminal chain', () => {
    const result = new QueryBuilder<UserModel, UserRelationships>().orderBy('age', 'desc').distinct()

    expect(result.getState().sort).toHaveLength(1)
    expect(result.getState().distinct).toBe(true)
  })

  it('should allow distinct → orderBy as terminal chain', () => {
    const result = new QueryBuilder<UserModel, UserRelationships>().distinct().orderBy('name', 'asc')

    expect(result.getState().distinct).toBe(true)
    expect(result.getState().sort).toHaveLength(1)
  })

  it('should preserve paranoid across cloned chain steps', () => {
    const result = new QueryBuilder<UserModel, UserRelationships>().paranoid(true).orderBy('name', 'asc').limit(5)

    expect(result.getState().paranoid).toBe(true)
    expect(result.getState().sort).toEqual([{ field: 'name', direction: 'asc' }])
    expect(result.getState().limit).toBe(5)
  })

  it('should allow and()/or() to chain into where', () => {
    const result = new QueryBuilder<UserModel, UserRelationships>()
      .where('name', 'eq', 'John')
      .or()
      .where('name', 'eq', 'Jane')
      .and()
      .where('age', 'gt', 18)

    expect(result.getState().where).toHaveLength(3)
    expect(result.getState().where[1].logicalOperator).toBe('or')
    expect(result.getState().where[2].logicalOperator).toBe('and')
  })

  it('should allow where → orWhere → aggregate flow', () => {
    const result = new QueryBuilder<UserModel, UserRelationships>()
      .where('age', 'gt', 30)
      .orWhere('department', 'eq', 'IT')
      .sum('salary')

    expect(result.getState().where).toHaveLength(2)
    expect(result.getState().aggregations).toHaveLength(1)
  })

  it('should allow whereGroup in initial phase and produce a FilterGroup', () => {
    const result = new QueryBuilder<UserModel, UserRelationships>()
      .whereGroup((q) => q.where('age', 'gt', 25).where('name', 'eq', 'John'))
      .select(['name', 'age'])

    expect(result.getState().where).toHaveLength(1)
    const group = result.getState().where[0]
    expect(group).toHaveProperty('type', 'group')
    if ('type' in group && group.type === 'group') {
      expect(group.filters).toHaveLength(2)
      expect(group.logicalOperator).toBe('and')
    }
    expect(result.getState().select).toEqual(['name', 'age'])
  })

  it('should allow subqueries inside whereGroup clauses', () => {
    const result = new QueryBuilder<UserModel, UserRelationships>().whereGroup((q) =>
      q
        .where('department', 'eq', 'IT')
        .orWhereExists((query: QueryBuilder<PostModel>) => query.where('id', 'gt', 0).limit(1))
    )

    const group = result.getState().where[0]
    expect(group).toHaveProperty('type', 'group')

    if ('type' in group && group.type === 'group') {
      expect(group.filters).toHaveLength(2)
      const subQuery = group.filters[1]
      expect(subQuery).toMatchObject({
        type: 'subQuery',
        operator: 'exists',
        logicalOperator: 'or'
      })
    }
  })
})
