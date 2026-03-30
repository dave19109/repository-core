import type {
  AsRelationshipDefinitions,
  EmptyRelationshipMap,
  ModelAttributeField,
  ModelAttributeFieldNumber
} from '../model/model-domain'
import type { PaginationResult } from '../types'
import type {
  AggregateQuery,
  CountQuery,
  FindAllQuery,
  FindOneQuery,
  MutationQuery,
  PaginateQuery
} from './repository-query-scopes'

export type QueryScopeCallback<TQuery> = (query: TQuery) => TQuery

export type FindAllQueryCallback<
  Model extends object = object,
  Rel extends AsRelationshipDefinitions<Rel> = EmptyRelationshipMap
> = QueryScopeCallback<FindAllQuery<Model, Rel>>
export type FindOneQueryCallback<
  Model extends object = object,
  Rel extends AsRelationshipDefinitions<Rel> = EmptyRelationshipMap
> = QueryScopeCallback<FindOneQuery<Model, Rel>>
export type PaginateQueryCallback<
  Model extends object = object,
  Rel extends AsRelationshipDefinitions<Rel> = EmptyRelationshipMap
> = QueryScopeCallback<PaginateQuery<Model, Rel>>
export type CountQueryCallback<
  Model extends object = object,
  Rel extends AsRelationshipDefinitions<Rel> = EmptyRelationshipMap
> = QueryScopeCallback<CountQuery<Model, Rel>>
export type AggregateQueryCallback<
  Model extends object = object,
  Rel extends AsRelationshipDefinitions<Rel> = EmptyRelationshipMap
> = QueryScopeCallback<AggregateQuery<Model, Rel>>
export type MutationQueryCallback<
  Model extends object = object,
  Rel extends AsRelationshipDefinitions<Rel> = EmptyRelationshipMap
> = QueryScopeCallback<MutationQuery<Model, Rel>>

/**
 * Read-only repository contract for an aggregate root.
 */
export interface RepositoryReader<
  Model extends object,
  DomainRecord extends object,
  Rel extends AsRelationshipDefinitions<Rel> = EmptyRelationshipMap
> {
  findAll(builder?: FindAllQueryCallback<Model, Rel>): Promise<DomainRecord[]>
  findOne(builder?: FindOneQueryCallback<Model, Rel>): Promise<DomainRecord | null>
  findById(id: string | number, builder?: FindOneQueryCallback<Model, Rel>): Promise<DomainRecord | null>
  exists(builder?: FindOneQueryCallback<Model, Rel>): Promise<boolean>
  paginate(builder?: PaginateQueryCallback<Model, Rel>): Promise<PaginationResult<DomainRecord>>
  count(builder?: CountQueryCallback<Model, Rel>): Promise<number>
  sum<Field extends ModelAttributeField<Model>>(
    field: Field,
    builder?: AggregateQueryCallback<Model, Rel>
  ): Promise<number>
  avg<Field extends ModelAttributeField<Model>>(
    field: Field,
    builder?: AggregateQueryCallback<Model, Rel>
  ): Promise<number>
  min<Field extends ModelAttributeField<Model>>(
    field: Field,
    builder?: AggregateQueryCallback<Model, Rel>
  ): Promise<number>
  max<Field extends ModelAttributeField<Model>>(
    field: Field,
    builder?: AggregateQueryCallback<Model, Rel>
  ): Promise<number>
}

/**
 * Write-only repository contract for an aggregate root.
 */
export interface RepositoryWriter<Model extends object, Rel extends AsRelationshipDefinitions<Rel> = EmptyRelationshipMap> {
  insert(model: Model[] | Model, query?: MutationQueryCallback<Model, Rel>): Promise<void>
  update(model: Partial<Model>, query?: MutationQueryCallback<Model, Rel>): Promise<void>
  upsert(model: Model, query?: MutationQueryCallback<Model, Rel>): Promise<void>
  destroy(model: Model[] | Model, query?: MutationQueryCallback<Model, Rel>): Promise<void>
  increment(
    field: ModelAttributeFieldNumber<Model>,
    value: number,
    query?: MutationQueryCallback<Model, Rel>
  ): Promise<void>
  decrement(
    field: ModelAttributeFieldNumber<Model>,
    value: number,
    query?: MutationQueryCallback<Model, Rel>
  ): Promise<void>
}

export interface RepositoryPort<
  Model extends object,
  DomainRecord extends object,
  Rel extends AsRelationshipDefinitions<Rel> = EmptyRelationshipMap
> extends RepositoryReader<Model, DomainRecord, Rel>,
    RepositoryWriter<Model, Rel> {}

export interface RepositoryMapperContract<PersistenceModel, DomainRecord extends object> {
  toPersistence(domain: DomainRecord): PersistenceModel
  toDomain(persistence: PersistenceModel): DomainRecord
}
