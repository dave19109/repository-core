import { QueryModel } from '../../model/query-model'
import type { Aggregation, WhereClause } from '../../types'

export function cloneQueryModel<M extends object>(state: Readonly<QueryModel<M, any>>): QueryModel<M, any> {
  return new QueryModel({
    where: state.where.map((clause) => cloneWhereClause(clause)),
    joins: state.joins.map((join) => ({
      ...join,
      query: join.query ? cloneQueryModel(join.query) : undefined
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

export function cloneWhereClause<M extends object>(clause: WhereClause<M>): WhereClause<M> {
  if ('type' in clause) {
    if (clause.type === 'group') {
      return {
        ...clause,
        filters: clause.filters.map((filter) => cloneWhereClause(filter))
      }
    }

    if (clause.type === 'subQuery') {
      return {
        ...clause,
        query: cloneQueryModel(clause.query)
      }
    }
  }

  return {
    ...clause,
    value: Array.isArray(clause.value) ? [...clause.value] : clause.value
  }
}

export function getAggregateAlias(aggregation: Aggregation<any>): string {
  if (aggregation.as) {
    return aggregation.as
  }

  const field = aggregation.field === '*' ? 'all' : String(aggregation.field).replaceAll('.', '_')
  return `${aggregation.fn}_${field}`
}

export function coerceNumeric(value: unknown): number {
  if (value === null || value === undefined) {
    return 0
  }

  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'bigint') {
    return Number(value)
  }

  if (typeof value === 'string') {
    const coerced = Number(value)
    if (!Number.isNaN(coerced)) {
      return coerced
    }
  }

  throw new Error(`ObjectionClient expected a numeric aggregate result, received ${String(value)}`)
}
