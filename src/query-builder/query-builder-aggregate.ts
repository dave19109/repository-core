import type { AsRelationshipDefinitions, EmptyRelationshipMap, ModelAttributeField } from '../model/model-domain'
import type { AggregateField, AggregateFunction, Aggregation } from '../types'
import { BaseQueryBuilder } from './base-query-builder'

export class QueryBuilderAggregate<
  Model extends object = object,
  Rel extends AsRelationshipDefinitions<Rel> = EmptyRelationshipMap
> extends BaseQueryBuilder<Model, Rel> {
  /**
   * Adds a MAX aggregate selection.
   */
  max<Field extends ModelAttributeField<Model>>(field: Field, as?: string): this {
    return this.aggregate('max', field, as)
  }

  /**
   * Adds a MIN aggregate selection.
   */
  min<Field extends ModelAttributeField<Model>>(field: Field, as?: string): this {
    return this.aggregate('min', field, as)
  }

  /**
   * Adds a SUM aggregate selection.
   */
  sum<Field extends ModelAttributeField<Model>>(field: Field, as?: string): this {
    return this.aggregate('sum', field, as)
  }

  /**
   * Adds an AVG aggregate selection.
   */
  avg<Field extends ModelAttributeField<Model>>(field: Field, as?: string): this {
    return this.aggregate('avg', field, as)
  }

  /**
   * Adds a COUNT aggregate selection.
   */
  count(field: AggregateField<Model> = '*', as?: string): this {
    return this.aggregate('count', field, as)
  }

  /**
   * Adds an aggregate selection to the query.
   */
  aggregate(fn: AggregateFunction, field: AggregateField<Model>, as?: string): this {
    const clone = this.clone()
    clone.state.aggregations.push({
      fn,
      field,
      as
    } as Aggregation<Model>)
    return clone
  }
}
