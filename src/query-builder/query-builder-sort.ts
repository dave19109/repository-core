import type { AsRelationshipDefinitions, EmptyRelationshipMap, ModelAttributeField } from '../model/model-domain'
import type { SortDirection } from '../types'
import { BaseQueryBuilder } from './base-query-builder'

export class QueryBuilderSort<
  Model extends object = object,
  Rel extends AsRelationshipDefinitions<Rel> = EmptyRelationshipMap
> extends BaseQueryBuilder<Model, Rel> {
  private static readonly VALID_DIRECTIONS: SortDirection[] = ['asc', 'desc']

  /**
   * Adds an ORDER BY clause to the query.
   *
   * @param {ModelAttributeField<Model>} field - The field to sort by.
   * @param {SortDirection} direction - The direction to sort by.
   * @returns {QueryBuilder<Model>} - Returns the current instance of QueryBuilder for method chaining.
   *
   * @example
   * const query = new QueryBuilder<User>(User)
   * query.orderBy('age', 'asc')
   * console.log(query) // QueryBuilder<User>
   * console.log(query.sortedFields) // [{ field: 'age', direction: 'asc' }]
   */
  orderBy<Field extends ModelAttributeField<Model>>(field: Field, direction: SortDirection): this {
    const clone = this.clone()
    if (QueryBuilderSort.VALID_DIRECTIONS.includes(direction)) {
      clone.state.sort.push({
        field,
        direction
      })
    }
    return clone
  }
}
