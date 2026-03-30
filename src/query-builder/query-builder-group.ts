import type { EmptyRelationshipMap, ModelAttributeField, RelationshipDefinitions } from '../model/model-domain'
import { BaseQueryBuilder } from './base-query-builder'

export class QueryBuilderGroup<
  Model extends object = object,
  Rel extends RelationshipDefinitions = EmptyRelationshipMap
> extends BaseQueryBuilder<Model, Rel> {
  /**
   * Adds a GROUP BY clause to the query.
   *
   * @param {ModelAttributeField<Model>} field - The field to group by.
   * @returns {QueryBuilder<Model>} - Returns the current instance of QueryBuilder for method chaining.
   *
   * @example
   * const query = new QueryBuilder<User>(User)
   * query.groupBy('age')
   * console.log(query) // QueryBuilder<User>
   * console.log(query.groupByFields) // ['age']
   */
  groupBy<Field extends ModelAttributeField<Model>>(field: Field): this {
    const clone = this.clone()
    if (!clone.state.groupBy.includes(field)) {
      clone.state.groupBy.push(field)
    }
    return clone
  }
}
