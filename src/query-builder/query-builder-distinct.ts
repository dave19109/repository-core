import type { AsRelationshipDefinitions, EmptyRelationshipMap } from '../model/model-domain'
import { BaseQueryBuilder } from './base-query-builder'

export class QueryBuilderDistinct<
  Model extends object = object,
  Rel extends AsRelationshipDefinitions<Rel> = EmptyRelationshipMap
> extends BaseQueryBuilder<Model, Rel> {
  /**
   * Adds a DISTINCT clause to the query.
   *
   * @returns {QueryBuilder<Model>} - Returns the current instance of QueryBuilder for method chaining.
   *
   * @example
   * const query = new QueryBuilder<User>(User)
   * query.distinct()
   * console.log(query) // QueryBuilder<User>
   * console.log(query.distinctOptions) // true
   */
  distinct(): this {
    const clone = this.clone()
    clone.state.distinct = true
    return clone
  }
}
