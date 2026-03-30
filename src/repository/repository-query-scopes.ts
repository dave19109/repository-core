import type { AsRelationshipDefinitions, EmptyRelationshipMap } from '../model/model-domain'
import type {
  CanAggregate,
  CanDistinct,
  CanGroupBy,
  CanLimit,
  CanSelect,
  CanSort,
  QueryBuilderInitial
} from '../query-builder/query-builder-phases'

type WithoutKeys<T, K extends PropertyKey> = Omit<T, Extract<keyof T, K>>

type WithoutAggregate<M extends object, Rel extends AsRelationshipDefinitions<Rel>, T> = WithoutKeys<
  T,
  keyof CanAggregate<M, Rel>
>

type WithoutSelect<M extends object, Rel extends AsRelationshipDefinitions<Rel>, T> = WithoutKeys<T, keyof CanSelect<M, Rel>>

type WithoutSort<M extends object, Rel extends AsRelationshipDefinitions<Rel>, T> = WithoutKeys<T, keyof CanSort<M, Rel>>

type WithoutDistinct<M extends object, Rel extends AsRelationshipDefinitions<Rel>, T> = WithoutKeys<
  T,
  keyof CanDistinct<M, Rel>
>

type WithoutLimit<M extends object, Rel extends AsRelationshipDefinitions<Rel>, T> = WithoutKeys<T, keyof CanLimit<M, Rel>>

type WithoutGroupBy<M extends object, Rel extends AsRelationshipDefinitions<Rel>, T> = WithoutKeys<T, keyof CanGroupBy<M, Rel>>

type BaseQuery<M extends object, Rel extends AsRelationshipDefinitions<Rel>> = QueryBuilderInitial<M, Rel>

type AfterAggregateRemoved<M extends object, Rel extends AsRelationshipDefinitions<Rel>> = WithoutAggregate<
  M,
  Rel,
  BaseQuery<M, Rel>
>

type AfterGroupByRemoved<M extends object, Rel extends AsRelationshipDefinitions<Rel>> = WithoutGroupBy<
  M,
  Rel,
  AfterAggregateRemoved<M, Rel>
>

type FindAllQueryInternal<M extends object, Rel extends AsRelationshipDefinitions<Rel>> = AfterGroupByRemoved<M, Rel>

type AfterSortRemoved<M extends object, Rel extends AsRelationshipDefinitions<Rel>> = WithoutSort<
  M,
  Rel,
  AfterGroupByRemoved<M, Rel>
>

export type FindAllQuery<
  M extends object,
  Rel extends AsRelationshipDefinitions<Rel> = EmptyRelationshipMap
> = FindAllQueryInternal<M, Rel>

/**
 * findOne: select, where, join.
 * No sort, limit/offset (handled internally), aggregate, distinct.
 */
export type FindOneQuery<
  M extends object,
  Rel extends AsRelationshipDefinitions<Rel> = EmptyRelationshipMap
> = WithoutDistinct<M, Rel, AfterSortRemoved<M, Rel>>

/**
 * count: where, join.
 * No select, sort, limit, aggregate, distinct.
 */
export type CountQuery<M extends object, Rel extends AsRelationshipDefinitions<Rel> = EmptyRelationshipMap> = WithoutSelect<
  M,
  Rel,
  WithoutLimit<M, Rel, WithoutDistinct<M, Rel, AfterSortRemoved<M, Rel>>>
>

/**
 * paginate: select, where, join, sort, distinct, limit/offset.
 */
export type PaginateQuery<M extends object, Rel extends AsRelationshipDefinitions<Rel> = EmptyRelationshipMap> = FindAllQuery<
  M,
  Rel
>

/**
 * sum/avg/min/max: where, join, groupBy.
 * No select, sort, limit, distinct (aggregate is applied by the repository).
 */
export type AggregateQuery<
  M extends object,
  Rel extends AsRelationshipDefinitions<Rel> = EmptyRelationshipMap
> = WithoutSelect<M, Rel, WithoutLimit<M, Rel, WithoutDistinct<M, Rel, AfterAggregateRemoved<M, Rel>>>>

/**
 * update/delete: where, join.
 * No select, sort, limit, aggregate, distinct.
 */
export type MutationQuery<M extends object, Rel extends AsRelationshipDefinitions<Rel> = EmptyRelationshipMap> = WithoutSelect<
  M,
  Rel,
  WithoutLimit<M, Rel, WithoutDistinct<M, Rel, WithoutSort<M, Rel, AfterGroupByRemoved<M, Rel>>>>
>
