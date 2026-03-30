import type {
  AsRelationshipDefinitions,
  EmptyRelationshipMap,
  ModelAttributeField,
  ModelAttributeValue
} from '../model/model-domain'
import { QueryModel } from '../model/query-model'
import type {
  ExistsSubQueryClause,
  ExtractFilterValueForField,
  FieldSubQueryClause,
  Filter,
  FilterGroup,
  LogicalOperator,
  Operator
} from '../types'
import { BaseQueryBuilder } from './base-query-builder'
import type { QueryBuilder } from './query-builder'
import { QueryBuilderBase } from './query-builder-base'

export type WhereCallback<Model extends object = object, Rel extends AsRelationshipDefinitions<Rel> = EmptyRelationshipMap> = (
  builder: QueryBuilderWhere<Model, Rel>
) => QueryBuilderWhere<Model, Rel>

type SubQueryStateCarrier<Model extends object = object> = {
  getState(): Readonly<QueryModel<Model, EmptyRelationshipMap>>
}

export type SubQueryCallback<Model extends object = object> = (
  builder: QueryBuilder<Model>
) => SubQueryStateCarrier<Model>
export type SubQueryInput<Model extends object = object> = SubQueryStateCarrier<Model> | SubQueryCallback<Model>

export class QueryBuilderWhere<
  Model extends object = object,
  Rel extends AsRelationshipDefinitions<Rel> = EmptyRelationshipMap
> extends BaseQueryBuilder<Model, Rel> {
  private static readonly NULL_OPERATORS = ['is_null', 'is_not_null'] as const

  /**
   * Adds a WHERE condition to the query.
   *
   * @param {ModelAttributeField<Model>} field - The field to filter by.
   * @param {Operator} operator - The comparison operator (e.g., '=', '>', '<', 'IS NULL', 'IS NOT NULL').
   * @param {ModelAttributeValue<Model>} value - The value to compare against (optional for IS NULL/IS NOT NULL).
   * @returns {QueryBuilder<Model>} - Returns the current instance of QueryBuilder for method chaining.
   *
   * @example
   * const query = new QueryBuilder<User>(User)
   * query.where('age', 'gt', 25)
   * query.where('email', 'is_null')
   * console.log(query) // QueryBuilder<User>
   */
  where<Field extends ModelAttributeField<Model>>(field: Field, operator: 'is_null' | 'is_not_null'): this
  where<Field extends ModelAttributeField<Model>, SubModel extends object>(
    field: Field,
    operator: 'in' | 'not_in',
    value: SubQueryInput<SubModel>
  ): this
  where<Field extends ModelAttributeField<Model>, T extends Exclude<Operator, 'is_null' | 'is_not_null'>>(
    field: Field,
    operator: T,
    value: ExtractFilterValueForField<Model, Field, T>
  ): this
  where<Field extends ModelAttributeField<Model>>(
    field: Field,
    operator: Operator,
    value?: ExtractFilterValueForField<Model, Field, Operator> | SubQueryInput
  ): this {
    const clone = this.clone()

    const item =
      (operator === 'in' || operator === 'not_in') && this.isSubQueryInput(value)
        ? this.buildFieldSubQueryClause(field, operator, value, clone.nextLogicalOperator)
        : this.buildWhereClause(
            field,
            operator,
            value as ExtractFilterValueForField<Model, Field, Operator>,
            clone.nextLogicalOperator
          )
    clone.state.where.push(item)

    return clone
  }

  /**
   * Adds a WHERE condition to the query with the logical operator OR.
   *
   * @param {ModelAttributeField<Model>} field - The field to filter by.
   * @param {Operator} operator - The comparison operator (e.g., '=', '>', '<', 'IS NULL', 'IS NOT NULL').
   * @param {ModelAttributeValue<Model>} value - The value to compare against (optional for IS NULL/IS NOT NULL).
   * @returns {QueryBuilder<Model>} - Returns the current instance of QueryBuilder for method chaining.
   *
   * @example
   * const query = new QueryBuilder<User>(User)
   * query.or().where('age', '>', 25)
   * console.log(query) // QueryBuilder<User>
   * console.log(query.whereClauses) // [{ field: 'age', operator: '>', value: 25, logicalOperator: 'or' }]
   * console.log(query.nextLogicalOperator) // 'or'
   */
  orWhere<Field extends ModelAttributeField<Model>>(field: Field, operator: 'is_null' | 'is_not_null'): this
  orWhere<Field extends ModelAttributeField<Model>, SubModel extends object>(
    field: Field,
    operator: 'in' | 'not_in',
    value: SubQueryInput<SubModel>
  ): this
  orWhere<Field extends ModelAttributeField<Model>, T extends Exclude<Operator, 'is_null' | 'is_not_null'>>(
    field: Field,
    operator: T,
    value: ExtractFilterValueForField<Model, Field, T>
  ): this
  orWhere<Field extends ModelAttributeField<Model>>(
    field: Field,
    operator: Operator,
    value?: ExtractFilterValueForField<Model, Field, Operator> | SubQueryInput
  ): this {
    const clone = this.clone()

    const item =
      (operator === 'in' || operator === 'not_in') && this.isSubQueryInput(value)
        ? this.buildFieldSubQueryClause(field, operator, value, 'or')
        : this.buildWhereClause(field, operator, value as ExtractFilterValueForField<Model, Field, Operator>, 'or')
    clone.state.where.push(item)

    return clone
  }

  /**
   * Adds a WHERE condition to the query with the logical operator AND.
   *
   * @param {WhereCallback<Model>} callback - The callback to build the WHERE condition.
   * @returns {QueryBuilder<Model>} - Returns the current instance of QueryBuilder for method chaining.
   *
   * @example
   * const query = new QueryBuilder<User>(User)
   * query.whereGroup((q) => {
   *   q.where('age', '>', 25)
   *   q.where('email', 'is_null')
   * })
   * console.log(query) // QueryBuilder<User>
   * console.log(query.whereClauses) // [{ field: 'age', operator: '>', value: 25, logicalOperator: 'and' }, { field: 'email', operator: 'is_null', value: null, logicalOperator: 'and' }]
   * console.log(query.nextLogicalOperator) // 'and'
   */
  whereGroup(callback: WhereCallback<Model, Rel>): this {
    const clone = this.clone()
    const groupQuery = new QueryBuilderWhere<Model, Rel>(new QueryModel<Model, Rel>({}))
    const result = callback(groupQuery)
    const group: FilterGroup<Model> = {
      type: 'group',
      logicalOperator: clone.nextLogicalOperator,
      filters: result.getState().where
    }
    clone.state.where.push(group)
    clone.nextLogicalOperator = 'and'

    return clone
  }

  /**
   * Adds a WHERE condition to the query with the operator BETWEEN.
   *
   * @param {ModelAttributeField<Model>} field - The field to filter by.
   * @param {ModelAttributeValue<Model>[]} value - The value to compare against (optional for IS NULL/IS NOT NULL).
   * @returns {QueryBuilder<Model>} - Returns the current instance of QueryBuilder for method chaining.
   *
   * @example
   * const query = new QueryBuilder<User>(User)
   * query.whereBetween('age', [25, 35])
   * console.log(query) // QueryBuilder<User>
   * console.log(query.whereClauses) // [{ field: 'age', operator: 'between', value: [25, 35], logicalOperator: 'and' }]
   * console.log(query.nextLogicalOperator) // 'and'
   */
  whereBetween<Field extends ModelAttributeField<Model>>(
    field: Field,
    value: [ModelAttributeValue<Model, Field>, ModelAttributeValue<Model, Field>]
  ): this {
    const clone = this.clone()
    const [min, max] = value

    if (min != null && max != null) {
      clone.state.where.push(this.buildWhereClause(field, 'between', [min, max], clone.nextLogicalOperator))
    }

    clone.nextLogicalOperator = 'and'

    return clone
  }
  /**
   * Adds a WHERE condition to the query with the operator IN.
   *
   * @param {ModelAttributeField<Model>} field - The field to filter by.
   * @param {ModelAttributeValue<Model>[]} value - The value to compare against.
   * @returns {QueryBuilder<Model>} - Returns the current instance of QueryBuilder for method chaining.
   *
   * @example
   * const query = new QueryBuilder<User>(User)
   * query.whereIn('age', [25, 35])
   * console.log(query) // QueryBuilder<User>
   * console.log(query.whereClauses) // [{ field: 'age', operator: 'in', value: [25, 35], logicalOperator: 'and' }]
   * console.log(query.nextLogicalOperator) // 'and'
   */
  whereIn<Field extends ModelAttributeField<Model>>(field: Field, value: ModelAttributeValue<Model, Field>[]): this {
    const clone = this.clone()
    if (Array.isArray(value) && value.length > 0) {
      clone.state.where.push(this.buildWhereClause(field, 'in', value, clone.nextLogicalOperator))
    }
    clone.nextLogicalOperator = 'and'
    return clone
  }

  /**
   * Adds a WHERE condition to the query with the operator NOT IN.
   *
   * @param {ModelAttributeField<Model>} field - The field to filter by.
   * @param {ModelAttributeValue<Model>[]} value - The value to compare against.
   * @returns {QueryBuilder<Model>} - Returns the current instance of QueryBuilder for method chaining.
   *
   * @example
   * const query = new QueryBuilder<User>(User)
   * query.whereNotIn('age', [25, 35])
   * console.log(query) // QueryBuilder<User>
   * console.log(query.whereClauses) // [{ field: 'age', operator: 'not_in', value: [25, 35], logicalOperator: 'and' }]
   * console.log(query.nextLogicalOperator) // 'and'
   */
  whereNotIn<Field extends ModelAttributeField<Model>>(field: Field, value: ModelAttributeValue<Model, Field>[]): this {
    const clone = this.clone()
    if (Array.isArray(value) && value.length > 0) {
      clone.state.where.push(this.buildWhereClause(field, 'not_in', value, clone.nextLogicalOperator))
    }
    clone.nextLogicalOperator = 'and'
    return clone
  }

  /**
   * Adds a WHERE IN subquery condition to the query.
   *
   * @param {ModelAttributeField<Model>} field - The field to filter by.
   * @param {SubQueryInput<SubModel>} subQuery - The subquery to compare against.
   * @returns {QueryBuilder<Model>} - Returns the current instance of QueryBuilder for method chaining.
   */
  whereInSubQuery<Field extends ModelAttributeField<Model>, SubModel extends object>(
    field: Field,
    subQuery: SubQueryInput<SubModel>
  ): this {
    const clone = this.clone()
    clone.state.where.push(this.buildFieldSubQueryClause(field, 'in', subQuery, clone.nextLogicalOperator))
    clone.nextLogicalOperator = 'and'
    return clone
  }

  /**
   * Adds a WHERE NOT IN subquery condition to the query.
   *
   * @param {ModelAttributeField<Model>} field - The field to filter by.
   * @param {SubQueryInput<SubModel>} subQuery - The subquery to compare against.
   * @returns {QueryBuilder<Model>} - Returns the current instance of QueryBuilder for method chaining.
   */
  whereNotInSubQuery<Field extends ModelAttributeField<Model>, SubModel extends object>(
    field: Field,
    subQuery: SubQueryInput<SubModel>
  ): this {
    const clone = this.clone()
    clone.state.where.push(this.buildFieldSubQueryClause(field, 'not_in', subQuery, clone.nextLogicalOperator))
    clone.nextLogicalOperator = 'and'
    return clone
  }

  /**
   * Adds a WHERE EXISTS subquery condition to the query.
   *
   * @param {SubQueryInput<SubModel>} subQuery - The subquery to check.
   * @returns {QueryBuilder<Model>} - Returns the current instance of QueryBuilder for method chaining.
   */
  whereExists<SubModel extends object>(subQuery: SubQueryInput<SubModel>): this {
    const clone = this.clone()
    clone.state.where.push(this.buildExistsSubQueryClause('exists', subQuery, clone.nextLogicalOperator))
    clone.nextLogicalOperator = 'and'
    return clone
  }

  /**
   * Adds a WHERE NOT EXISTS subquery condition to the query.
   *
   * @param {SubQueryInput<SubModel>} subQuery - The subquery to check.
   * @returns {QueryBuilder<Model>} - Returns the current instance of QueryBuilder for method chaining.
   */
  whereNotExists<SubModel extends object>(subQuery: SubQueryInput<SubModel>): this {
    const clone = this.clone()
    clone.state.where.push(this.buildExistsSubQueryClause('not_exists', subQuery, clone.nextLogicalOperator))
    clone.nextLogicalOperator = 'and'
    return clone
  }

  /**
   * Adds a WHERE condition to the query with the operator IS NULL.
   *
   * @param {ModelAttributeField<Model>} field - The field to filter by.
   * @returns {QueryBuilder<Model>} - Returns the current instance of QueryBuilder for method chaining.
   *
   * @example
   * const query = new QueryBuilder<User>(User)
   * query.whereNull('age')
   * console.log(query) // QueryBuilder<User>
   * console.log(query.whereClauses) // [{ field: 'age', operator: 'is_null', value: null, logicalOperator: 'and' }]
   * console.log(query.nextLogicalOperator) // 'and'
   */
  whereNull<Field extends ModelAttributeField<Model>>(field: Field): this {
    const clone = this.clone()
    clone.state.where.push(this.buildWhereClause(field, 'is_null', null, clone.nextLogicalOperator))
    clone.nextLogicalOperator = 'and'
    return clone
  }

  /**
   * Adds a WHERE condition to the query with the operator IS NOT NULL.
   *
   * @param {ModelAttributeField<Model>} field - The field to filter by.
   * @returns {QueryBuilder<Model>} - Returns the current instance of QueryBuilder for method chaining.
   *
   * @example
   * const query = new QueryBuilder<User>(User)
   * query.whereNotNull('age')
   * console.log(query) // QueryBuilder<User>
   * console.log(query.whereClauses) // [{ field: 'age', operator: 'is_not_null', value: null, logicalOperator: 'and' }]
   * console.log(query.nextLogicalOperator) // 'and'
   */
  whereNotNull<Field extends ModelAttributeField<Model>>(field: Field): this {
    const clone = this.clone()
    clone.state.where.push(this.buildWhereClause(field, 'is_not_null', null, clone.nextLogicalOperator))
    clone.nextLogicalOperator = 'and'
    return clone
  }

  /**
   * Sets the logical operator to AND for the next WHERE clause.
   *
   * @returns {QueryBuilder<Model>} - Returns the current instance of QueryBuilder for method chaining.
   *
   * @example
   * const query = new QueryBuilder<User>(User)
   * query.and().where('age', '>', 25)
   * console.log(query) // QueryBuilder<User>
   * console.log(query.whereClauses) // [{ field: 'age', operator: '>', value: 25, logicalOperator: 'and' }]
   * console.log(query.nextLogicalOperator) // 'and'
   */
  and(): this {
    const clone = this.clone()
    clone.nextLogicalOperator = 'and'
    return clone
  }

  /**
   * Sets the logical operator to OR for the next WHERE clause.
   *
   * @returns {QueryBuilder<Model>} - Returns the current instance of QueryBuilder for method chaining.
   *
   * @example
   * const query = new QueryBuilder<User>(User)
   * query.or().where('age', '>', 25)
   * console.log(query) // QueryBuilder<User>
   */
  or(): this {
    const clone = this.clone()
    clone.nextLogicalOperator = 'or'
    return clone
  }

  /**
   * Adds a WHERE IN subquery condition to the query with the logical operator OR.
   *
   * @param {ModelAttributeField<Model>} field - The field to filter by.
   * @param {SubQueryInput<SubModel>} subQuery - The subquery to compare against.
   * @returns {QueryBuilder<Model>} - Returns the current instance of QueryBuilder for method chaining.
   */
  orWhereInSubQuery<Field extends ModelAttributeField<Model>, SubModel extends object>(
    field: Field,
    subQuery: SubQueryInput<SubModel>
  ): this {
    const clone = this.clone()
    clone.state.where.push(this.buildFieldSubQueryClause(field, 'in', subQuery, 'or'))
    clone.nextLogicalOperator = 'and'
    return clone
  }

  /**
   * Adds a WHERE NOT IN subquery condition to the query with the logical operator OR.
   *
   * @param {ModelAttributeField<Model>} field - The field to filter by.
   * @param {SubQueryInput<SubModel>} subQuery - The subquery to compare against.
   * @returns {QueryBuilder<Model>} - Returns the current instance of QueryBuilder for method chaining.
   */
  orWhereNotInSubQuery<Field extends ModelAttributeField<Model>, SubModel extends object>(
    field: Field,
    subQuery: SubQueryInput<SubModel>
  ): this {
    const clone = this.clone()
    clone.state.where.push(this.buildFieldSubQueryClause(field, 'not_in', subQuery, 'or'))
    clone.nextLogicalOperator = 'and'
    return clone
  }

  /**
   * Adds a WHERE EXISTS subquery condition to the query with the logical operator OR.
   *
   * @param {SubQueryInput<SubModel>} subQuery - The subquery to check.
   * @returns {QueryBuilder<Model>} - Returns the current instance of QueryBuilder for method chaining.
   */
  orWhereExists<SubModel extends object>(subQuery: SubQueryInput<SubModel>): this {
    const clone = this.clone()
    clone.state.where.push(this.buildExistsSubQueryClause('exists', subQuery, 'or'))
    clone.nextLogicalOperator = 'and'
    return clone
  }

  /**
   * Adds a WHERE NOT EXISTS subquery condition to the query with the logical operator OR.
   *
   * @param {SubQueryInput<SubModel>} subQuery - The subquery to check.
   * @returns {QueryBuilder<Model>} - Returns the current instance of QueryBuilder for method chaining.
   */
  orWhereNotExists<SubModel extends object>(subQuery: SubQueryInput<SubModel>): this {
    const clone = this.clone()
    clone.state.where.push(this.buildExistsSubQueryClause('not_exists', subQuery, 'or'))
    clone.nextLogicalOperator = 'and'
    return clone
  }

  /**
   * Builds a WHERE clause for the query.
   *
   * @param {ModelAttributeField<Model>} field - The field to filter by.
   * @param {Operator} operator - The comparison operator (e.g., '=', '>', '<', 'IS NULL', 'IS NOT NULL').
   * @param {ModelAttributeValue<Model>} value - The value to compare against (optional for IS NULL/IS NOT NULL).
   * @param {LogicalOperator} logicalOperator - The logical operator (AND or OR).
   * @returns {Filter<Model>} - Returns the WHERE clause for the query.
   *
   * @example
   * const query = new QueryBuilder<User>(User)
   * const whereClause = query.buildWhereClause('age', '>', 25, 'and')
   * console.log(whereClause) // { field: 'age', operator: '>', value: 25, logicalOperator: 'and' }
   */
  private buildWhereClause<Field extends ModelAttributeField<Model>, T extends Operator>(
    field: Field,
    operator: T,
    value?: ExtractFilterValueForField<Model, Field, T>,
    logicalOperator?: LogicalOperator
  ): Filter<Model, T> {
    const isNullOp = (QueryBuilderWhere.NULL_OPERATORS as readonly Operator[]).includes(operator)
    return {
      field,
      operator,
      value: isNullOp ? null : (value as ModelAttributeValue<Model>),
      logicalOperator: logicalOperator ?? this.nextLogicalOperator
    } as Filter<Model, T>
  }

  private buildFieldSubQueryClause<Field extends ModelAttributeField<Model>, SubModel extends object>(
    field: Field,
    operator: 'in' | 'not_in',
    subQuery: SubQueryInput<SubModel>,
    logicalOperator?: LogicalOperator
  ): FieldSubQueryClause<Model, SubModel> {
    return {
      type: 'subQuery',
      field,
      operator,
      query: BaseQueryBuilder.cloneQueryModel(this.resolveSubQuery(subQuery)),
      logicalOperator: logicalOperator ?? this.nextLogicalOperator
    }
  }

  private buildExistsSubQueryClause<SubModel extends object>(
    operator: 'exists' | 'not_exists',
    subQuery: SubQueryInput<SubModel>,
    logicalOperator?: LogicalOperator
  ): ExistsSubQueryClause<SubModel> {
    return {
      type: 'subQuery',
      operator,
      query: BaseQueryBuilder.cloneQueryModel(this.resolveSubQuery(subQuery)),
      logicalOperator: logicalOperator ?? this.nextLogicalOperator
    }
  }

  private resolveSubQuery<SubModel extends object>(
    subQuery: SubQueryInput<SubModel>
  ): QueryModel<SubModel, EmptyRelationshipMap> {
    const builder = typeof subQuery === 'function' ? subQuery(this.createSubQueryBuilder<SubModel>()) : subQuery
    return BaseQueryBuilder.cloneQueryModel(builder.getState())
  }

  private isSubQueryInput(value: unknown): value is SubQueryInput {
    return typeof value === 'function' || this.isSubQueryStateCarrier(value)
  }

  private isSubQueryStateCarrier(value: unknown): value is SubQueryStateCarrier {
    return (
      typeof value === 'object' &&
      value !== null &&
      'getState' in value &&
      typeof (value as { getState?: unknown }).getState === 'function'
    )
  }

  private createSubQueryBuilder<SubModel extends object>(): QueryBuilder<SubModel> {
    return new QueryBuilderBase<SubModel>() as unknown as QueryBuilder<SubModel>
  }
}
