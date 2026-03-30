import type { AsRelationshipDefinitions, EmptyRelationshipMap } from '../model/model-domain'
import { BaseQueryBuilder } from './base-query-builder'

export class QueryBuilderPagination<
  Model extends object = object,
  Rel extends AsRelationshipDefinitions<Rel> = EmptyRelationshipMap
> extends BaseQueryBuilder<Model, Rel> {
  /**
   * Adds a LIMIT clause to the query.
   *
   * @param {number} limit - The maximum number of rows to return.
   * @returns {QueryBuilder<Model>} - Returns the current instance of QueryBuilder for method chaining.
   */
  limit(limit: number): this {
    const clone = this.clone()
    clone.state.limit = limit
    return clone
  }

  /**
   * Adds an OFFSET clause to the query.
   *
   * @param {number} offset - The number of rows to skip.
   * @returns {QueryBuilder<Model>} - Returns the current instance of QueryBuilder for method chaining.
   */
  offset(offset: number): this {
    const offsetNum = Number(offset)
    if (offsetNum < 0) {
      throw new Error('Offset must be greater than 0')
    }
    const clone = this.clone()
    clone.state.offset = offsetNum
    return clone
  }
}
