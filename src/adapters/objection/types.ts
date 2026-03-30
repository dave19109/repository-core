import type { Model, ModelClass, QueryBuilder } from 'objection'
import type { QueryModel } from '../../model/query-model'
import type { SubQueryClause } from '../../types'

export type AnyModelClass = ModelClass<Model>
export type AnyObjectionQueryBuilder = QueryBuilder<Model, any> & Record<string, (...args: any[]) => any>
export type MaybeCompositeId = string | number | bigint | Buffer | Array<string | number | bigint | Buffer>

export interface ObjectionQueryBuildOptions {
  applyPagination?: boolean
}

export interface ObjectionQuery<
  PersistenceModel extends Model = Model,
  DomainQueryModel extends object = PersistenceModel
> {
  state: Readonly<QueryModel<DomainQueryModel, any>>
  createBuilder(options?: ObjectionQueryBuildOptions): QueryBuilder<PersistenceModel, PersistenceModel[]>
}

export interface ObjectionSubQueryResolverContext {
  clause: SubQueryClause<any, any>
  modelClass: AnyModelClass
}

export interface ObjectionClientOptions<DomainQueryModel extends object = object> {
  paranoidField?: string | keyof DomainQueryModel
  versionField?: string | keyof DomainQueryModel
  resolveSubQueryModel?: (context: ObjectionSubQueryResolverContext) => AnyModelClass | undefined
}
