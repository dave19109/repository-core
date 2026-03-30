import type { AsRelationshipDefinitions, EmptyRelationshipMap } from '../model/model-domain'
import type { SelectFields } from '../types'
import { BaseQueryBuilder } from './base-query-builder'

export class QueryBuilderSelect<
  Model extends object = object,
  Rel extends AsRelationshipDefinitions<Rel> = EmptyRelationshipMap
> extends BaseQueryBuilder<Model, Rel> {
  private static readonly DEFAULT_SELECT_FIELDS = ['*'] as const

  /**
   * Selects the fields to be returned by the query.
   *
   * @param {ModelAttributeField<Model>[]} fields - The fields to select.
   * @returns {QueryBuilder<Model>} - Returns the current instance of QueryBuilder for method chaining.
   *
   * @example
   * const query = new QueryBuilder<User>(User)
   * query.field(['name', 'email'])
   * console.log(query) // QueryBuilder<User>
   * console.log(query.selectedFields) // ['name', 'email']
   */
  select(fields: SelectFields<Model>): this {
    const clone = this.clone()
    clone.state.select =
      Array.isArray(fields) && fields.length > 0
        ? fields
        : (QueryBuilderSelect.DEFAULT_SELECT_FIELDS as SelectFields<Model>)

    return clone
  }
}
