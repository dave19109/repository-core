import type {
  AsRelationshipDefinitions,
  EmptyRelationshipMap,
  ExtractRelationshipFields,
  ExtractRelationshipTargetModel,
  ModelAttributeField,
  ModelAttributeValue
} from './model/model-domain'
import type { QueryModel } from './model/query-model'

export type AggregateFunction = 'count' | 'sum' | 'avg' | 'min' | 'max'

export type AggregateField<M extends object> = ModelAttributeField<M> | '*'

export interface Aggregation<M extends object = object> {
  fn: AggregateFunction
  field: AggregateField<M>
  as?: string
}

export type Operator =
  | 'eq' // Equal to
  | 'ne' // Not equal to
  | 'gt' // Greater than
  | 'gte' // Greater than or equal to
  | 'lt' // Less than
  | 'lte' // Less than or equal to
  | 'in' // In
  | 'not_in' // Not in
  | 'between' // Between
  | 'not_between' // Not between
  | 'is_null' // Is null
  | 'is_not_null' // Is not null
  | 'like' // Like
  | 'ilike' // Ilike
  | 'not_like' // Not like
  | 'not_ilike' // Not ilike
  | 'starts_with' // Starts with
  | 'ends_with' // Ends with
  | 'contains' // Contains
  | 'contain_any' // Contains any of the elements
  | 'contain_all' // Contains all of the elements

export type LogicalOperator = 'and' | 'or' | 'not'

export type ExtractFilterValue<Model extends object = object, T extends Operator = Operator> = T extends
  | 'is_null'
  | 'is_not_null'
  ? null
  : T extends 'between' | 'not_between'
    ? [ModelAttributeValue<Model>, ModelAttributeValue<Model>]
    : T extends 'in' | 'not_in'
      ? ModelAttributeValue<Model>[]
      : ModelAttributeValue<Model>

export type ExtractFilterValueForField<
  Model extends object = object,
  Field extends ModelAttributeField<Model> = ModelAttributeField<Model>,
  T extends Operator = Operator
> = T extends 'is_null' | 'is_not_null'
  ? null
  : T extends 'between' | 'not_between'
    ? [ModelAttributeValue<Model, Field>, ModelAttributeValue<Model, Field>]
    : T extends 'in' | 'not_in'
      ? ModelAttributeValue<Model, Field>[]
      : ModelAttributeValue<Model, Field>

export interface Filter<Model extends object = object, T extends Operator = Operator> {
  field: ModelAttributeField<Model>
  operator: T
  value: ExtractFilterValue<Model, T>
  logicalOperator: LogicalOperator
}

export interface FilterGroup<Model extends object = object> {
  type: 'group'
  logicalOperator: LogicalOperator
  filters: WhereClause<Model>[]
}

export type SubQueryOperator = 'in' | 'not_in' | 'exists' | 'not_exists'

export interface FieldSubQueryClause<Model extends object = object, SubModel extends object = object> {
  type: 'subQuery'
  field: ModelAttributeField<Model>
  operator: 'in' | 'not_in'
  query: QueryModel<SubModel, EmptyRelationshipMap>
  logicalOperator: LogicalOperator
}

export interface ExistsSubQueryClause<SubModel extends object = object> {
  type: 'subQuery'
  operator: 'exists' | 'not_exists'
  query: QueryModel<SubModel, EmptyRelationshipMap>
  logicalOperator: LogicalOperator
}

export type SubQueryClause<Model extends object = object, SubModel extends object = object> =
  | FieldSubQueryClause<Model, SubModel>
  | ExistsSubQueryClause<SubModel>

export type WhereClause<Model extends object = object> = Filter<Model> | FilterGroup<Model> | SubQueryClause<Model, any>

export type SelectFields<M extends object> = ModelAttributeField<M>[] | ['*']

export type SortDirection = 'asc' | 'desc'

export type LockMode = 'for update' | 'for share'

export interface SortField<M extends object> {
  field: ModelAttributeField<M>
  direction: SortDirection
}

export type JoinType = 'inner' | 'left' | 'right' | 'full' | 'cross'

export interface Join<
  M extends object,
  Rel extends AsRelationshipDefinitions<Rel> = EmptyRelationshipMap,
  R extends ExtractRelationshipFields<M, Rel> = ExtractRelationshipFields<M, Rel>
> {
  type: JoinType
  relationship: R
  query?: QueryModel<ExtractRelationshipTargetModel<M, R, Rel>, EmptyRelationshipMap>
}

interface PaginationMeta {
  totalPages: number
  currentPage: number
  pageSize: number
  recordCount: number
}

export interface PaginationResult<T> {
  items: T[]
  meta: PaginationMeta
}
