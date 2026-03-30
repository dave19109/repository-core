import type { AsRelationshipDefinitions, EmptyRelationshipMap } from '../model/model-domain'
import { BaseQueryBuilder } from './base-query-builder'

export class QueryBuilderParanoid<
  Model extends object = object,
  Rel extends AsRelationshipDefinitions<Rel> = EmptyRelationshipMap
> extends BaseQueryBuilder<Model, Rel> {
  /**
   * Adds a PARANOID clause to the query.
   *
   * @param {boolean} paranoid - The paranoid clause to add to the query.
   * @returns {QueryBuilder<Model>} - Returns the current instance of QueryBuilder for method chaining.
   */
  paranoid(paranoid: boolean): this {
    const clone = this.clone()
    clone.state.paranoid = paranoid
    return clone
  }
}
