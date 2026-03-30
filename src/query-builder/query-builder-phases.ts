import type {
  EmptyRelationshipMap,
  ExtractRelationshipFields,
  ExtractRelationshipTargetModel,
  ModelAttributeField,
  ModelAttributeValue,
  RelationshipDefinitions
} from '../model/model-domain'
import type { QueryModel } from '../model/query-model'
import type {
  AggregateField,
  AggregateFunction,
  ExtractFilterValueForField,
  Operator,
  SelectFields,
  SortDirection
} from '../types'
import type { JoinQueryInput } from './query-builder-join'
import type { SubQueryInput } from './query-builder-where'

// ─── Capability Blocks ────────────────────────────────────────────────

export interface HasGetState<M extends object, Rel extends RelationshipDefinitions = EmptyRelationshipMap> {
  getState(): Readonly<QueryModel<M, Rel>>
}

export interface CanSelect<M extends object, Rel extends RelationshipDefinitions = EmptyRelationshipMap> {
  select(fields: SelectFields<M>): QueryBuilderAfterSelect<M, Rel>
}

export interface CanJoin<M extends object, Rel extends RelationshipDefinitions = EmptyRelationshipMap> {
  join<R extends ExtractRelationshipFields<M, Rel>>(relationship: R): QueryBuilderAfterJoin<M, Rel>
  join<R extends ExtractRelationshipFields<M, Rel>>(
    relationship: R,
    query: JoinQueryInput<ExtractRelationshipTargetModel<M, R, Rel>>
  ): QueryBuilderAfterJoin<M, Rel>
  leftJoin<R extends ExtractRelationshipFields<M, Rel>>(relationship: R): QueryBuilderAfterJoin<M, Rel>
  leftJoin<R extends ExtractRelationshipFields<M, Rel>>(
    relationship: R,
    query: JoinQueryInput<ExtractRelationshipTargetModel<M, R, Rel>>
  ): QueryBuilderAfterJoin<M, Rel>
  rightJoin<R extends ExtractRelationshipFields<M, Rel>>(relationship: R): QueryBuilderAfterJoin<M, Rel>
  rightJoin<R extends ExtractRelationshipFields<M, Rel>>(
    relationship: R,
    query: JoinQueryInput<ExtractRelationshipTargetModel<M, R, Rel>>
  ): QueryBuilderAfterJoin<M, Rel>
  fullJoin<R extends ExtractRelationshipFields<M, Rel>>(relationship: R): QueryBuilderAfterJoin<M, Rel>
  fullJoin<R extends ExtractRelationshipFields<M, Rel>>(
    relationship: R,
    query: JoinQueryInput<ExtractRelationshipTargetModel<M, R, Rel>>
  ): QueryBuilderAfterJoin<M, Rel>
  crossJoin<R extends ExtractRelationshipFields<M, Rel>>(relationship: R): QueryBuilderAfterJoin<M, Rel>
  crossJoin<R extends ExtractRelationshipFields<M, Rel>>(
    relationship: R,
    query: JoinQueryInput<ExtractRelationshipTargetModel<M, R, Rel>>
  ): QueryBuilderAfterJoin<M, Rel>
}

export interface CanWhereStart<M extends object, Rel extends RelationshipDefinitions = EmptyRelationshipMap> {
  where<Field extends ModelAttributeField<M>>(
    field: Field,
    operator: 'is_null' | 'is_not_null'
  ): QueryBuilderAfterWhere<M, Rel>
  where<Field extends ModelAttributeField<M>, SubModel extends object>(
    field: Field,
    operator: 'in' | 'not_in',
    value: SubQueryInput<SubModel>
  ): QueryBuilderAfterWhere<M, Rel>
  where<Field extends ModelAttributeField<M>, T extends Exclude<Operator, 'is_null' | 'is_not_null'>>(
    field: Field,
    operator: T,
    value: ExtractFilterValueForField<M, Field, T>
  ): QueryBuilderAfterWhere<M, Rel>
  whereBetween<Field extends ModelAttributeField<M>>(
    field: Field,
    value: [ModelAttributeValue<M, Field>, ModelAttributeValue<M, Field>]
  ): QueryBuilderAfterWhere<M, Rel>
  whereIn<Field extends ModelAttributeField<M>>(
    field: Field,
    value: ModelAttributeValue<M, Field>[]
  ): QueryBuilderAfterWhere<M, Rel>
  whereNotIn<Field extends ModelAttributeField<M>>(
    field: Field,
    value: ModelAttributeValue<M, Field>[]
  ): QueryBuilderAfterWhere<M, Rel>
  whereInSubQuery<Field extends ModelAttributeField<M>, SubModel extends object>(
    field: Field,
    subQuery: SubQueryInput<SubModel>
  ): QueryBuilderAfterWhere<M, Rel>
  whereNotInSubQuery<Field extends ModelAttributeField<M>, SubModel extends object>(
    field: Field,
    subQuery: SubQueryInput<SubModel>
  ): QueryBuilderAfterWhere<M, Rel>
  whereExists<SubModel extends object>(subQuery: SubQueryInput<SubModel>): QueryBuilderAfterWhere<M, Rel>
  whereNotExists<SubModel extends object>(subQuery: SubQueryInput<SubModel>): QueryBuilderAfterWhere<M, Rel>
  whereNull<Field extends ModelAttributeField<M>>(field: Field): QueryBuilderAfterWhere<M, Rel>
  whereNotNull<Field extends ModelAttributeField<M>>(field: Field): QueryBuilderAfterWhere<M, Rel>
  whereGroup(
    callback: (
      builder: import('./query-builder-where').QueryBuilderWhere<M, Rel>
    ) => import('./query-builder-where').QueryBuilderWhere<M, Rel>
  ): QueryBuilderAfterWhere<M, Rel>
}

export interface CanWhereContinue<M extends object, Rel extends RelationshipDefinitions = EmptyRelationshipMap>
  extends CanWhereStart<M, Rel> {
  orWhere<Field extends ModelAttributeField<M>>(
    field: Field,
    operator: 'is_null' | 'is_not_null'
  ): QueryBuilderAfterWhere<M, Rel>
  orWhere<Field extends ModelAttributeField<M>, SubModel extends object>(
    field: Field,
    operator: 'in' | 'not_in',
    value: SubQueryInput<SubModel>
  ): QueryBuilderAfterWhere<M, Rel>
  orWhere<Field extends ModelAttributeField<M>, T extends Exclude<Operator, 'is_null' | 'is_not_null'>>(
    field: Field,
    operator: T,
    value: ExtractFilterValueForField<M, Field, T>
  ): QueryBuilderAfterWhere<M, Rel>
  orWhereInSubQuery<Field extends ModelAttributeField<M>, SubModel extends object>(
    field: Field,
    subQuery: SubQueryInput<SubModel>
  ): QueryBuilderAfterWhere<M, Rel>
  orWhereNotInSubQuery<Field extends ModelAttributeField<M>, SubModel extends object>(
    field: Field,
    subQuery: SubQueryInput<SubModel>
  ): QueryBuilderAfterWhere<M, Rel>
  orWhereExists<SubModel extends object>(subQuery: SubQueryInput<SubModel>): QueryBuilderAfterWhere<M, Rel>
  orWhereNotExists<SubModel extends object>(subQuery: SubQueryInput<SubModel>): QueryBuilderAfterWhere<M, Rel>
  and(): QueryBuilderAfterWhereLogical<M, Rel>
  or(): QueryBuilderAfterWhereLogical<M, Rel>
}

export interface CanAggregate<M extends object, Rel extends RelationshipDefinitions = EmptyRelationshipMap> {
  count(field?: AggregateField<M>, as?: string): QueryBuilderAfterAggregate<M, Rel>
  sum<Field extends ModelAttributeField<M>>(field: Field, as?: string): QueryBuilderAfterAggregate<M, Rel>
  avg<Field extends ModelAttributeField<M>>(field: Field, as?: string): QueryBuilderAfterAggregate<M, Rel>
  min<Field extends ModelAttributeField<M>>(field: Field, as?: string): QueryBuilderAfterAggregate<M, Rel>
  max<Field extends ModelAttributeField<M>>(field: Field, as?: string): QueryBuilderAfterAggregate<M, Rel>
  aggregate(fn: AggregateFunction, field: AggregateField<M>, as?: string): QueryBuilderAfterAggregate<M, Rel>
}

export interface CanGroupBy<M extends object, Rel extends RelationshipDefinitions = EmptyRelationshipMap> {
  groupBy<Field extends ModelAttributeField<M>>(field: Field): QueryBuilderAfterGroupBy<M, Rel>
}

export interface CanSort<M extends object, Rel extends RelationshipDefinitions = EmptyRelationshipMap> {
  orderBy<Field extends ModelAttributeField<M>>(field: Field, direction: SortDirection): QueryBuilderAfterSort<M, Rel>
}

export interface CanDistinct<M extends object, Rel extends RelationshipDefinitions = EmptyRelationshipMap> {
  distinct(): QueryBuilderAfterDistinct<M, Rel>
}

export interface CanParanoid {
  paranoid(paranoid: boolean): this
}

export interface CanLimit<M extends object, Rel extends RelationshipDefinitions = EmptyRelationshipMap> {
  limit(limit: number): QueryBuilderAfterLimit<M, Rel>
  offset(offset: number): QueryBuilderAfterLimit<M, Rel>
}

export interface CanLock<M extends object, Rel extends RelationshipDefinitions = EmptyRelationshipMap> {
  lock(mode: import('../types').LockMode): QueryBuilderAfterWhere<M, Rel>
}

// ─── Phase Compositions ───────────────────────────────────────────────

/**
 * Initial phase: all operations available.
 */
export type QueryBuilderInitial<
  M extends object,
  Rel extends RelationshipDefinitions = EmptyRelationshipMap
> = HasGetState<M, Rel> &
  CanSelect<M, Rel> &
  CanJoin<M, Rel> &
  CanWhereStart<M, Rel> &
  CanAggregate<M, Rel> &
  CanGroupBy<M, Rel> &
  CanSort<M, Rel> &
  CanDistinct<M, Rel> &
  CanParanoid &
  CanLimit<M, Rel> &
  CanLock<M, Rel>

/**
 * After JOIN: same as initial (joins are early in SQL pipeline).
 */
export type QueryBuilderAfterJoin<
  M extends object,
  Rel extends RelationshipDefinitions = EmptyRelationshipMap
> = QueryBuilderInitial<M, Rel>

/**
 * After SELECT: everything except re-selecting.
 */
export type QueryBuilderAfterSelect<
  M extends object,
  Rel extends RelationshipDefinitions = EmptyRelationshipMap
> = HasGetState<M, Rel> &
  CanJoin<M, Rel> &
  CanWhereStart<M, Rel> &
  CanAggregate<M, Rel> &
  CanGroupBy<M, Rel> &
  CanSort<M, Rel> &
  CanDistinct<M, Rel> &
  CanParanoid &
  CanLimit<M, Rel> &
  CanLock<M, Rel>

/**
 * After WHERE: everything + orWhere/and/or for continued filtering.
 */
export type QueryBuilderAfterWhere<
  M extends object,
  Rel extends RelationshipDefinitions = EmptyRelationshipMap
> = HasGetState<M, Rel> &
  CanSelect<M, Rel> &
  CanJoin<M, Rel> &
  CanWhereContinue<M, Rel> &
  CanAggregate<M, Rel> &
  CanGroupBy<M, Rel> &
  CanSort<M, Rel> &
  CanDistinct<M, Rel> &
  CanParanoid &
  CanLimit<M, Rel> &
  CanLock<M, Rel>

/**
 * After and()/or(): only where operations allowed (must follow with a where clause).
 */
export type QueryBuilderAfterWhereLogical<
  M extends object,
  Rel extends RelationshipDefinitions = EmptyRelationshipMap
> = CanWhereStart<M, Rel>

/**
 * After AGGREGATE: no more where/select/join — only aggregate, groupBy, sort, distinct, limit.
 */
export type QueryBuilderAfterAggregate<
  M extends object,
  Rel extends RelationshipDefinitions = EmptyRelationshipMap
> = HasGetState<M, Rel> &
  CanAggregate<M, Rel> &
  CanGroupBy<M, Rel> &
  CanSort<M, Rel> &
  CanDistinct<M, Rel> &
  CanParanoid &
  CanLimit<M, Rel> &
  CanLock<M, Rel>

/**
 * After GROUP BY: no more where/select/join — only groupBy, aggregate, sort, distinct, limit.
 */
export type QueryBuilderAfterGroupBy<
  M extends object,
  Rel extends RelationshipDefinitions = EmptyRelationshipMap
> = HasGetState<M, Rel> &
  CanAggregate<M, Rel> &
  CanGroupBy<M, Rel> &
  CanSort<M, Rel> &
  CanDistinct<M, Rel> &
  CanParanoid &
  CanLimit<M, Rel> &
  CanLock<M, Rel>

/**
 * After ORDER BY: only more ordering, distinct, limit, or done.
 */
export type QueryBuilderAfterSort<
  M extends object,
  Rel extends RelationshipDefinitions = EmptyRelationshipMap
> = HasGetState<M, Rel> & CanSort<M, Rel> & CanDistinct<M, Rel> & CanParanoid & CanLimit<M, Rel> & CanLock<M, Rel>

/**
 * After DISTINCT: only ordering, limit, or done.
 */
export type QueryBuilderAfterDistinct<
  M extends object,
  Rel extends RelationshipDefinitions = EmptyRelationshipMap
> = HasGetState<M, Rel> & CanSort<M, Rel> & CanParanoid & CanLimit<M, Rel> & CanLock<M, Rel>

/**
 * After LIMIT/OFFSET: only more limit/offset or done (terminal phase).
 */
export type QueryBuilderAfterLimit<
  M extends object,
  Rel extends RelationshipDefinitions = EmptyRelationshipMap
> = HasGetState<M, Rel> & CanParanoid & CanLimit<M, Rel> & CanLock<M, Rel>
