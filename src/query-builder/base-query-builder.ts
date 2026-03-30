import type { EmptyRelationshipMap, RelationshipDefinitions } from '../model/model-domain'
import { QueryModel } from '../model/query-model'
import type { LogicalOperator, WhereClause } from '../types'

export class BaseQueryBuilder<
  Model extends object = object,
  Rel extends RelationshipDefinitions = EmptyRelationshipMap
> {
  protected nextLogicalOperator: LogicalOperator = 'and'
  constructor(protected state: QueryModel<Model, Rel>) {}

  /**
   * Returns the current state of the query builder.
   *
   * @returns {Readonly<QueryModel<Model>>} - Returns the current state of the query builder.
   */
  getState(): Readonly<QueryModel<Model, Rel>> {
    return this.state
  }

  /**
   * Clones the current instance of BaseQueryBuilder.
   *
   * @returns {BaseQueryBuilder<Model>} - Returns the cloned instance of BaseQueryBuilder.
   */
  protected clone(): this {
    const cloned = Object.create(Object.getPrototypeOf(this)) as this

    cloned.nextLogicalOperator = this.nextLogicalOperator

    cloned.state = BaseQueryBuilder.cloneQueryModel(this.state)

    return cloned
  }

  protected static cloneQueryModel<M extends object, R extends RelationshipDefinitions = EmptyRelationshipMap>(
    state: Readonly<QueryModel<M, R>>
  ): QueryModel<M, R> {
    return new QueryModel({
      where: state.where.map((clause) => BaseQueryBuilder.cloneWhereClause(clause)),
      joins: state.joins.map((join) => ({
        ...join,
        query: join.query ? BaseQueryBuilder.cloneQueryModel(join.query) : undefined
      })),
      groupBy: [...state.groupBy],
      aggregations: state.aggregations.map((aggregation) => ({ ...aggregation })),
      sort: state.sort.map((sortField) => ({ ...sortField })),
      select: [...state.select],
      distinct: state.distinct,
      paranoid: state.paranoid,
      limit: state.limit,
      offset: state.offset,
      lock: state.lock
    })
  }

  protected static cloneWhereClause<M extends object>(clause: WhereClause<M>): WhereClause<M> {
    if ('type' in clause) {
      if (clause.type === 'group') {
        return {
          ...clause,
          filters: clause.filters.map((filter) => BaseQueryBuilder.cloneWhereClause(filter))
        }
      }

      if (clause.type === 'subQuery') {
        return {
          ...clause,
          query: BaseQueryBuilder.cloneQueryModel(clause.query)
        }
      }
    }

    return {
      ...clause,
      value: Array.isArray(clause.value) ? [...clause.value] : clause.value
    }
  }
}
