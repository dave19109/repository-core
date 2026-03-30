import type { Aggregation, Join, SelectFields, SortField, WhereClause } from '../types'
import type { EmptyRelationshipMap, ModelAttributeField, RelationshipDefinitions } from './model-domain'

interface QueryModelOptions<M extends object = object, Rel extends RelationshipDefinitions = EmptyRelationshipMap> {
  select: SelectFields<M>
  joins: Join<M, Rel>[]
  aggregations: Aggregation<M>[]
  sort: SortField<M>[]
  groupBy: ModelAttributeField<M>[]
  where: WhereClause<M>[]
  distinct: boolean
  limit?: number | undefined
  offset?: number | undefined
  paranoid?: boolean | undefined
}

/**
 * The query model.
 * This class is used to store the query state.
 * @param {M} M - The model type.
 * @returns {QueryModel<M>} - The query model.
 * @example
 * const query = new QueryModel<User>({
 *   select: ['name', 'email'],
 *   joins: ['posts'],
 *   aggregations: ['count'],
 *   sort: ['name', 'email'],
 *   groupBy: ['name', 'email'],
 *   where: ['name', 'email'],
 *   distinct: true,
 *   limit: 10,
 *   offset: 0,
 *   paranoid: true
 * })
 * console.log(query) // QueryModel<User>
 */
export class QueryModel<M extends object = object, Rel extends RelationshipDefinitions = EmptyRelationshipMap>
  implements QueryModelOptions<M, Rel>
{
  /**
   * The default select fields.
   */
  private static readonly DEFAULT_SELECT_FIELDS = ['*'] as const
  /**
   * The default paranoid value.
   */
  private static readonly DEFAULT_PARANOID = false
  /**
   * The default distinct value.
   */
  private static readonly DEFAULT_DISTINCT = false

  /**
   * The select fields.
   */
  select: SelectFields<M> = []
  /**
   * The joins.
   */
  joins: Join<M, Rel>[] = []
  /**
   * The aggregations.
   */
  aggregations: Aggregation<M>[] = []
  /**
   * The sort fields.
   */
  sort: SortField<M>[] = []
  /**
   * The group by fields.
   */
  groupBy: ModelAttributeField<M>[] = []
  /**
   * The where clauses.
   */
  where: WhereClause<M>[] = []
  /**
   * The distinct value.
   */
  distinct = false
  /**
   * The limit.
   */
  limit: number | undefined = undefined
  /**
   * The offset.
   */
  offset: number | undefined = undefined
  /**
   * The paranoid value.
   */
  paranoid: boolean | undefined = undefined

  constructor(props: Partial<QueryModelOptions<M, Rel>>) {
    this.select = props.select ?? (QueryModel.DEFAULT_SELECT_FIELDS as SelectFields<M>)
    this.joins = props.joins ?? []
    this.aggregations = props.aggregations ?? []
    this.sort = props.sort ?? []
    this.groupBy = props.groupBy ?? []
    this.where = props.where ?? []
    this.distinct = props.distinct ?? QueryModel.DEFAULT_DISTINCT
    this.limit = props.limit
    this.offset = props.offset
    this.paranoid = props.paranoid ?? QueryModel.DEFAULT_PARANOID
  }
}
