/**
 * Type-level tests for QueryBuilder phase constraints.
 * These tests verify that invalid method chains produce compile errors.
 */
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

new QueryBuilder<UserModel, UserRelationships>().select(['name'])
new QueryBuilder<UserModel, UserRelationships>().join('posts')
new QueryBuilder<UserModel, UserRelationships>().join('posts', (query) =>
  query.where('title', 'like', 'Lead%').limit(5)
)
new QueryBuilder<UserModel, UserRelationships>().where('age', 'gt', 30)
new QueryBuilder<UserModel, UserRelationships>().where(
  'age',
  'in',
  new QueryBuilder<PostModel>().select(['id']).where('id', 'gt', 0)
)
new QueryBuilder<UserModel, UserRelationships>().whereExists(
  new QueryBuilder<PostModel>().select(['id']).where('id', 'gt', 0)
)
new QueryBuilder<UserModel, UserRelationships>().whereInSubQuery(
  'age',
  new QueryBuilder<PostModel>().select(['id']).where('id', 'gt', 0)
)
new QueryBuilder<UserModel, UserRelationships>().sum('salary')
new QueryBuilder<UserModel, UserRelationships>().groupBy('department')
new QueryBuilder<UserModel, UserRelationships>().orderBy('age', 'asc')
new QueryBuilder<UserModel, UserRelationships>().distinct()
new QueryBuilder<UserModel, UserRelationships>().paranoid(true)
new QueryBuilder<UserModel, UserRelationships>().limit(10)
new QueryBuilder<UserModel, UserRelationships>().offset(5)
new QueryBuilder<UserModel, UserRelationships>().getState()

new QueryBuilder<UserModel, UserRelationships>()
  .join('posts')
  .where('age', 'gt', 30)
  .select(['name', 'age'])
  .sum('salary')
  .groupBy('department')
  .orderBy('age', 'asc')
  .distinct()
  .getState()

new QueryBuilder<UserModel, UserRelationships>().where('age', 'gt', 30).orWhere('name', 'eq', 'John').sum('salary')
new QueryBuilder<UserModel, UserRelationships>()
  .where('age', 'gt', 30)
  .orWhere('age', 'not_in', new QueryBuilder<PostModel>().select(['id']).limit(1))
new QueryBuilder<UserModel, UserRelationships>()
  .where('age', 'gt', 30)
  .orWhereExists(new QueryBuilder<PostModel>().select(['id']).limit(1))
new QueryBuilder<UserModel, UserRelationships>().sum('salary').avg('age').count()
new QueryBuilder<UserModel, UserRelationships>()
  .sum('salary')
  .groupBy('department')
  .orderBy('age', 'asc')
  .distinct()
  .limit(10)
  .offset(0)
new QueryBuilder<UserModel, UserRelationships>().where('age', 'gt', 30).paranoid(true).orderBy('age', 'asc')
new QueryBuilder<UserModel, UserRelationships>().limit(10).paranoid(true).offset(5).getState()
new QueryBuilder<UserModel, UserRelationships>().limit(10).offset(5).getState()
new QueryBuilder<UserModel, UserRelationships>().offset(5).limit(10).getState()
new QueryBuilder<UserModel, UserRelationships>().where('age', 'gt', 30).or().where('name', 'eq', 'John')
new QueryBuilder<UserModel, UserRelationships>().whereGroup((query) =>
  query.where('age', 'gt', 18).orWhereExists(new QueryBuilder<PostModel>().select(['id']).where('id', 'gt', 0))
)
// @ts-expect-error - Join callback must target the relationship model
new QueryBuilder<UserModel, UserRelationships>().join('posts', (query) => query.where('salary', 'gt', 0))

// @ts-expect-error - Cannot use where after aggregate
new QueryBuilder<UserModel, UserRelationships>().sum('salary').where('age', 'gt', 30)
// @ts-expect-error - Cannot use subquery filters after aggregate
new QueryBuilder<UserModel, UserRelationships>().sum('salary').whereExists(new QueryBuilder<PostModel>().select(['id']))
// @ts-expect-error - Cannot use select after aggregate
new QueryBuilder<UserModel, UserRelationships>().sum('salary').select(['name'])
// @ts-expect-error - Cannot use join after aggregate
new QueryBuilder<UserModel, UserRelationships>().sum('salary').join('posts')
// @ts-expect-error - Cannot use where after groupBy
new QueryBuilder<UserModel, UserRelationships>().groupBy('department').where('age', 'gt', 30)
// @ts-expect-error - Cannot use select after groupBy
new QueryBuilder<UserModel, UserRelationships>().groupBy('department').select(['name'])
// @ts-expect-error - Cannot use join after groupBy
new QueryBuilder<UserModel, UserRelationships>().groupBy('department').join('posts')
// @ts-expect-error - Cannot use where after orderBy
new QueryBuilder<UserModel, UserRelationships>().orderBy('age', 'asc').where('age', 'gt', 30)
// @ts-expect-error - Cannot use select after orderBy
new QueryBuilder<UserModel, UserRelationships>().orderBy('age', 'asc').select(['name'])
// @ts-expect-error - Cannot use join after orderBy
new QueryBuilder<UserModel, UserRelationships>().orderBy('age', 'asc').join('posts')
// @ts-expect-error - Cannot use aggregate after orderBy
new QueryBuilder<UserModel, UserRelationships>().orderBy('age', 'asc').sum('salary')
// @ts-expect-error - Cannot use groupBy after orderBy
new QueryBuilder<UserModel, UserRelationships>().orderBy('age', 'asc').groupBy('department')
// @ts-expect-error - Cannot use where after distinct
new QueryBuilder<UserModel, UserRelationships>().distinct().where('age', 'gt', 30)
// @ts-expect-error - Cannot use select after distinct
new QueryBuilder<UserModel, UserRelationships>().distinct().select(['name'])
// @ts-expect-error - Cannot use join after distinct
new QueryBuilder<UserModel, UserRelationships>().distinct().join('posts')
// @ts-expect-error - Cannot use aggregate after distinct
new QueryBuilder<UserModel, UserRelationships>().distinct().sum('salary')
// @ts-expect-error - Cannot use groupBy after distinct
new QueryBuilder<UserModel, UserRelationships>().distinct().groupBy('department')
// @ts-expect-error - Cannot use where after limit
new QueryBuilder<UserModel, UserRelationships>().limit(10).where('age', 'gt', 30)
// @ts-expect-error - Cannot use select after limit
new QueryBuilder<UserModel, UserRelationships>().limit(10).select(['name'])
// @ts-expect-error - Cannot use join after limit
new QueryBuilder<UserModel, UserRelationships>().limit(10).join('posts')
// @ts-expect-error - Cannot use aggregate after limit
new QueryBuilder<UserModel, UserRelationships>().limit(10).sum('salary')
// @ts-expect-error - Cannot use groupBy after limit
new QueryBuilder<UserModel, UserRelationships>().limit(10).groupBy('department')
// @ts-expect-error - Cannot use orderBy after limit
new QueryBuilder<UserModel, UserRelationships>().limit(10).orderBy('age', 'asc')
// @ts-expect-error - Cannot use distinct after limit
new QueryBuilder<UserModel, UserRelationships>().limit(10).distinct()
// @ts-expect-error - Cannot use select after limit even after paranoid
new QueryBuilder<UserModel, UserRelationships>().limit(10).paranoid(true).select(['name'])
// @ts-expect-error - Cannot use where after offset
new QueryBuilder<UserModel, UserRelationships>().offset(5).where('age', 'gt', 30)
// @ts-expect-error - Cannot use select after offset
new QueryBuilder<UserModel, UserRelationships>().offset(5).select(['name'])
// @ts-expect-error - Cannot use join after offset
new QueryBuilder<UserModel, UserRelationships>().offset(5).join('posts')
// @ts-expect-error - Cannot use aggregate after offset
new QueryBuilder<UserModel, UserRelationships>().offset(5).sum('salary')
// @ts-expect-error - Cannot use groupBy after offset
new QueryBuilder<UserModel, UserRelationships>().offset(5).groupBy('department')
// @ts-expect-error - Cannot use orderBy after offset
new QueryBuilder<UserModel, UserRelationships>().offset(5).orderBy('age', 'asc')
// @ts-expect-error - Cannot use distinct after offset
new QueryBuilder<UserModel, UserRelationships>().offset(5).distinct()
// @ts-expect-error - Cannot use select after and()
new QueryBuilder<UserModel, UserRelationships>().where('age', 'gt', 30).and().select(['name'])
// @ts-expect-error - Cannot use orderBy after or()
new QueryBuilder<UserModel, UserRelationships>().where('age', 'gt', 30).or().orderBy('age', 'asc')
// @ts-expect-error - Cannot use getState after and()
new QueryBuilder<UserModel, UserRelationships>().where('age', 'gt', 30).and().getState()
// @ts-expect-error - Cannot use orWhere from initial phase
new QueryBuilder<UserModel, UserRelationships>().orWhere('age', 'gt', 30)
// @ts-expect-error - Cannot use and() from initial phase
new QueryBuilder<UserModel, UserRelationships>().and()
// @ts-expect-error - Cannot use or() from initial phase
new QueryBuilder<UserModel, UserRelationships>().or()
// @ts-expect-error - Cannot select twice
new QueryBuilder<UserModel, UserRelationships>().select(['name']).select(['age'])
