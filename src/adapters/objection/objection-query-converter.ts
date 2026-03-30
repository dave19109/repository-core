import type { Knex } from 'knex'
import type { Model, ModelClass, QueryBuilder } from 'objection'
import type { QueryModel } from '../../model/query-model'
import type { RepositoryQueryConverter } from '../../repository/repository-query-converter'
import type { Aggregation, Filter, FilterGroup, Join, SubQueryClause, WhereClause } from '../../types'
import type {
  AnyModelClass,
  AnyObjectionQueryBuilder,
  ObjectionClientOptions,
  ObjectionQuery,
  ObjectionQueryBuildOptions
} from './types'
import { cloneQueryModel } from './utils'

export class ObjectionQueryConverter<PersistenceModel extends Model, DomainQueryModel extends object = PersistenceModel>
  implements RepositoryQueryConverter<DomainQueryModel, ObjectionQuery<PersistenceModel, DomainQueryModel>>
{
  constructor(
    private readonly modelClass: ModelClass<PersistenceModel>,
    private readonly options: ObjectionClientOptions<DomainQueryModel> = {},
    private readonly trx?: Knex.Transaction
  ) {}

  toPersistenceQuery(
    query: Readonly<QueryModel<DomainQueryModel, any>>
  ): ObjectionQuery<PersistenceModel, DomainQueryModel> {
    const state = cloneQueryModel(query)

    return {
      state,
      createBuilder: (options) =>
        this.applyState(
          this.modelClass.query(this.trx) as unknown as AnyObjectionQueryBuilder,
          state,
          this.modelClass,
          { applyPagination: options?.applyPagination ?? true }
        ) as unknown as QueryBuilder<PersistenceModel, PersistenceModel[]>
    }
  }

  private applyState<QueryModelShape extends object>(
    builder: AnyObjectionQueryBuilder,
    state: Readonly<QueryModel<QueryModelShape>>,
    modelClass: AnyModelClass,
    options: Required<ObjectionQueryBuildOptions>
  ): AnyObjectionQueryBuilder {
    this.applyJoins(builder, state, modelClass)
    this.applyParanoid(builder, state, modelClass)
    this.applyWhere(builder, state, modelClass)
    this.applySelect(builder, state, modelClass)
    this.applyAggregations(builder, state, modelClass)
    this.applyGroupBy(builder, state, modelClass)
    this.applyDistinct(builder, state)
    this.applySort(builder, state, modelClass)

    if (options.applyPagination) {
      this.applyPagination(builder, state)
    }

    this.applyLock(builder, state)

    return builder
  }

  private applyJoins<QueryModelShape extends object>(
    builder: AnyObjectionQueryBuilder,
    state: Readonly<QueryModel<QueryModelShape>>,
    modelClass: AnyModelClass
  ): void {
    const modifiers: Record<string, (queryBuilder: AnyObjectionQueryBuilder) => void> = {}

    state.joins.forEach((join, index) => {
      const joinQuery = join.query
      if (!joinQuery) {
        return
      }

      const relatedModelClass = this.resolveJoinModelClass(modelClass, String(join.relationship))
      const modifierName = this.buildJoinModifierName(join, index)

      modifiers[modifierName] = (queryBuilder) => {
        this.applyState(queryBuilder, joinQuery, relatedModelClass, {
          applyPagination: true
        })
      }
    })

    if (Object.keys(modifiers).length > 0) {
      builder.modifiers(modifiers as any)
    }

    for (const [index, join] of state.joins.entries()) {
      const expression = join.query
        ? `${String(join.relationship)}(${this.buildJoinModifierName(join, index)})`
        : String(join.relationship)

      switch (join.type) {
        case 'inner':
          builder.joinRelated(expression)
          break
        case 'left':
          builder.leftJoinRelated(expression)
          break
        case 'right':
          builder.rightJoinRelated(expression)
          break
        case 'full':
          builder.fullOuterJoinRelated(expression)
          break
        case 'cross':
          throw new Error('ObjectionClient does not support cross joins for relation-based joins')
      }
    }
  }

  private applyParanoid<QueryModelShape extends object>(
    builder: AnyObjectionQueryBuilder,
    state: Readonly<QueryModel<QueryModelShape>>,
    modelClass: AnyModelClass
  ): void {
    if (!(state.paranoid && this.options.paranoidField)) {
      return
    }

    builder.whereNull(this.toColumnName(modelClass, String(this.options.paranoidField)))
  }

  private applyWhere<QueryModelShape extends object>(
    builder: AnyObjectionQueryBuilder,
    state: Readonly<QueryModel<QueryModelShape>>,
    modelClass: AnyModelClass
  ): void {
    for (const clause of state.where) {
      this.applyWhereClause(builder, clause, modelClass)
    }
  }

  private applyWhereClause(
    builder: AnyObjectionQueryBuilder,
    clause: WhereClause<any>,
    modelClass: AnyModelClass
  ): void {
    if ('type' in clause && clause.type === 'group') {
      this.applyWhereGroup(builder, clause, modelClass)
      return
    }

    if ('type' in clause && clause.type === 'subQuery') {
      this.applySubQueryClause(builder, clause, modelClass)
      return
    }

    this.applyFilterClause(builder, clause, modelClass)
  }

  private applyWhereGroup(
    builder: AnyObjectionQueryBuilder,
    clause: FilterGroup<any>,
    modelClass: AnyModelClass
  ): void {
    const method = clause.logicalOperator === 'or' ? 'orWhere' : clause.logicalOperator === 'not' ? 'whereNot' : 'where'

    builder[method]((groupBuilder: AnyObjectionQueryBuilder) => {
      for (const nestedClause of clause.filters) {
        this.applyWhereClause(groupBuilder, nestedClause, modelClass)
      }
    })
  }

  private applyFilterClause(builder: AnyObjectionQueryBuilder, clause: Filter<any>, modelClass: AnyModelClass): void {
    const column = this.toColumnName(modelClass, String(clause.field))

    switch (clause.operator) {
      case 'eq':
        this.callLogicalWhere(builder, clause.logicalOperator, column, '=', clause.value)
        break
      case 'ne':
        this.callLogicalWhere(builder, clause.logicalOperator, column, '!=', clause.value)
        break
      case 'gt':
        this.callLogicalWhere(builder, clause.logicalOperator, column, '>', clause.value)
        break
      case 'gte':
        this.callLogicalWhere(builder, clause.logicalOperator, column, '>=', clause.value)
        break
      case 'lt':
        this.callLogicalWhere(builder, clause.logicalOperator, column, '<', clause.value)
        break
      case 'lte':
        this.callLogicalWhere(builder, clause.logicalOperator, column, '<=', clause.value)
        break
      case 'in':
        this.callLogicalMethod(
          builder,
          clause.logicalOperator,
          'whereIn',
          'orWhereIn',
          'whereNotIn',
          column,
          clause.value
        )
        break
      case 'not_in':
        this.callLogicalMethod(
          builder,
          clause.logicalOperator,
          'whereNotIn',
          'orWhereNotIn',
          'whereIn',
          column,
          clause.value
        )
        break
      case 'between':
        this.callLogicalMethod(
          builder,
          clause.logicalOperator,
          'whereBetween',
          'orWhereBetween',
          'whereNotBetween',
          column,
          clause.value
        )
        break
      case 'not_between':
        this.callLogicalMethod(
          builder,
          clause.logicalOperator,
          'whereNotBetween',
          'orWhereNotBetween',
          'whereBetween',
          column,
          clause.value
        )
        break
      case 'is_null':
        this.callLogicalMethod(builder, clause.logicalOperator, 'whereNull', 'orWhereNull', 'whereNotNull', column)
        break
      case 'is_not_null':
        this.callLogicalMethod(builder, clause.logicalOperator, 'whereNotNull', 'orWhereNotNull', 'whereNull', column)
        break
      case 'like':
        this.callLogicalMethod(
          builder,
          clause.logicalOperator,
          'whereLike',
          'orWhereLike',
          'whereNot',
          column,
          clause.value
        )
        break
      case 'ilike':
        this.callLogicalMethod(
          builder,
          clause.logicalOperator,
          'whereILike',
          'orWhereILike',
          'whereNot',
          column,
          clause.value
        )
        break
      case 'not_like':
        this.callLogicalWhere(builder, clause.logicalOperator, column, 'not like', clause.value)
        break
      case 'not_ilike':
        this.callLogicalWhere(builder, clause.logicalOperator, column, 'not ilike', clause.value)
        break
      case 'starts_with':
        this.callLogicalMethod(
          builder,
          clause.logicalOperator,
          'whereLike',
          'orWhereLike',
          'whereNot',
          column,
          `${String(clause.value)}%`
        )
        break
      case 'ends_with':
        this.callLogicalMethod(
          builder,
          clause.logicalOperator,
          'whereLike',
          'orWhereLike',
          'whereNot',
          column,
          `%${String(clause.value)}`
        )
        break
      case 'contains':
        this.callLogicalMethod(
          builder,
          clause.logicalOperator,
          'whereLike',
          'orWhereLike',
          'whereNot',
          column,
          `%${String(clause.value)}%`
        )
        break
      case 'contain_any':
        this.callLogicalMethod(
          builder,
          clause.logicalOperator,
          'whereJsonHasAny',
          'orWhereJsonHasAny',
          'whereJsonHasAll',
          column,
          clause.value
        )
        break
      case 'contain_all':
        this.callLogicalMethod(
          builder,
          clause.logicalOperator,
          'whereJsonHasAll',
          'orWhereJsonHasAll',
          'whereJsonHasAny',
          column,
          clause.value
        )
        break
    }
  }

  private applySubQueryClause(
    builder: AnyObjectionQueryBuilder,
    clause: SubQueryClause<any, any>,
    modelClass: AnyModelClass
  ): void {
    const subQueryModelClass = this.options.resolveSubQueryModel?.({
      clause,
      modelClass
    })

    if (!subQueryModelClass) {
      throw new Error(
        'ObjectionClient cannot translate subqueries without a resolveSubQueryModel option that returns the target model class'
      )
    }

    const subQuery = this.applyState(
      subQueryModelClass.query() as unknown as AnyObjectionQueryBuilder,
      clause.query,
      subQueryModelClass,
      {
        applyPagination: true
      }
    )

    if ('field' in clause) {
      const column = this.toColumnName(modelClass, String(clause.field))
      if (clause.operator === 'in') {
        this.callLogicalMethod(builder, clause.logicalOperator, 'whereIn', 'orWhereIn', 'whereNotIn', column, subQuery)
        return
      }

      this.callLogicalMethod(builder, clause.logicalOperator, 'whereNotIn', 'orWhereNotIn', 'whereIn', column, subQuery)
      return
    }

    if (clause.operator === 'exists') {
      this.callLogicalMethod(
        builder,
        clause.logicalOperator,
        'whereExists',
        'orWhereExists',
        'whereNotExists',
        subQuery
      )
      return
    }

    this.callLogicalMethod(
      builder,
      clause.logicalOperator,
      'whereNotExists',
      'orWhereNotExists',
      'whereExists',
      subQuery
    )
  }

  private applySelect<QueryModelShape extends object>(
    builder: AnyObjectionQueryBuilder,
    state: Readonly<QueryModel<QueryModelShape>>,
    modelClass: AnyModelClass
  ): void {
    if (state.select.length === 1 && state.select[0] === '*') {
      return
    }

    if (state.select.length === 0) {
      return
    }

    builder.select(...state.select.map((field) => this.toColumnName(modelClass, String(field))))
  }

  private applyAggregations<QueryModelShape extends object>(
    builder: AnyObjectionQueryBuilder,
    state: Readonly<QueryModel<QueryModelShape>>,
    modelClass: AnyModelClass
  ): void {
    for (const aggregation of state.aggregations) {
      const aliasedColumn = this.getAliasedAggregateColumn(aggregation, modelClass)

      switch (aggregation.fn) {
        case 'count':
          builder.count(aliasedColumn)
          break
        case 'sum':
          builder.sum(aliasedColumn)
          break
        case 'avg':
          builder.avg(aliasedColumn)
          break
        case 'min':
          builder.min(aliasedColumn)
          break
        case 'max':
          builder.max(aliasedColumn)
          break
      }
    }
  }

  private applyGroupBy<QueryModelShape extends object>(
    builder: AnyObjectionQueryBuilder,
    state: Readonly<QueryModel<QueryModelShape>>,
    modelClass: AnyModelClass
  ): void {
    if (state.groupBy.length === 0) {
      return
    }

    builder.groupBy(...state.groupBy.map((field) => this.toColumnName(modelClass, String(field))))
  }

  private applyDistinct<QueryModelShape extends object>(
    builder: AnyObjectionQueryBuilder,
    state: Readonly<QueryModel<QueryModelShape>>
  ): void {
    if (state.distinct) {
      builder.distinct()
    }
  }

  private applySort<QueryModelShape extends object>(
    builder: AnyObjectionQueryBuilder,
    state: Readonly<QueryModel<QueryModelShape>>,
    modelClass: AnyModelClass
  ): void {
    for (const sort of state.sort) {
      builder.orderBy(this.toColumnName(modelClass, String(sort.field)), sort.direction)
    }
  }

  private applyPagination<QueryModelShape extends object>(
    builder: AnyObjectionQueryBuilder,
    state: Readonly<QueryModel<QueryModelShape>>
  ): void {
    if (state.limit !== undefined) {
      builder.limit(state.limit)
    }

    if (state.offset !== undefined) {
      builder.offset(state.offset)
    }
  }

  private applyLock<QueryModelShape extends object>(
    builder: AnyObjectionQueryBuilder,
    state: Readonly<QueryModel<QueryModelShape>>
  ): void {
    if (state.lock === 'for update') {
      builder.forUpdate()
    } else if (state.lock === 'for share') {
      builder.forShare()
    }
  }

  private callLogicalWhere(
    builder: AnyObjectionQueryBuilder,
    logicalOperator: 'and' | 'or' | 'not',
    column: string,
    operator: string,
    value: unknown
  ): void {
    const dynamicBuilder = builder as Record<string, (...args: any[]) => any>

    switch (logicalOperator) {
      case 'or':
        dynamicBuilder.orWhere(column, operator, value)
        return
      case 'not':
        dynamicBuilder.whereNot(column, operator, value)
        return
      default:
        dynamicBuilder.where(column, operator, value)
    }
  }

  private callLogicalMethod(
    builder: AnyObjectionQueryBuilder,
    logicalOperator: 'and' | 'or' | 'not',
    andMethod: string,
    orMethod: string,
    notMethod: string,
    ...args: unknown[]
  ): void {
    switch (logicalOperator) {
      case 'or':
        builder[orMethod](...args)
        return
      case 'not':
        builder[notMethod](...args)
        return
      default:
        builder[andMethod](...args)
    }
  }

  private getAliasedAggregateColumn(aggregation: Aggregation<any>, modelClass: AnyModelClass): string {
    const field = aggregation.field === '*' ? '*' : this.toColumnName(modelClass, String(aggregation.field))
    return `${field} as ${getAggregateAlias(aggregation)}`
  }

  private toColumnName(modelClass: AnyModelClass, field: string): string {
    return field === '*' ? field : modelClass.propertyNameToColumnName(field)
  }

  private resolveJoinModelClass(modelClass: AnyModelClass, relationship: string): AnyModelClass {
    const relation = modelClass.getRelation(relationship) as { relatedModelClass?: AnyModelClass }

    if (!relation.relatedModelClass) {
      throw new Error(`ObjectionClient could not resolve related model class for relationship "${relationship}"`)
    }

    return relation.relatedModelClass
  }

  private buildJoinModifierName(join: Pick<Join<any, any>, 'relationship'>, index: number): string {
    const sanitizedRelationship = String(join.relationship).replaceAll(/[^a-zA-Z0-9_]/g, '_')
    return `qb_join_${sanitizedRelationship}_${index}`
  }
}

function getAggregateAlias(aggregation: Aggregation<any>): string {
  if (aggregation.as) {
    return aggregation.as
  }

  const field = aggregation.field === '*' ? 'all' : String(aggregation.field).replaceAll('.', '_')
  return `${aggregation.fn}_${field}`
}
