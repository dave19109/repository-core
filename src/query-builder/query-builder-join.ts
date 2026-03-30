import type {
  EmptyRelationshipMap,
  ExtractRelationshipFields,
  ExtractRelationshipTargetModel,
  RelationshipDefinitions
} from '../model/model-domain'
import type { QueryModel } from '../model/query-model'
import type { JoinType } from '../types'
import { BaseQueryBuilder } from './base-query-builder'
import type { QueryBuilder } from './query-builder'
import { QueryBuilderBase } from './query-builder-base'

type JoinQueryStateCarrier<Model extends object = object> = {
  getState(): Readonly<QueryModel<Model, EmptyRelationshipMap>>
}

export type JoinQueryCallback<Model extends object = object> = (
  builder: QueryBuilder<Model>
) => JoinQueryStateCarrier<Model>

export type JoinQueryInput<Model extends object = object> = JoinQueryStateCarrier<Model> | JoinQueryCallback<Model>

export class QueryBuilderJoin<
  Model extends object = object,
  Rel extends RelationshipDefinitions = EmptyRelationshipMap
> extends BaseQueryBuilder<Model, Rel> {
  /**
   * Joins a relationship to the query.
   *
   * @param {ExtractRelationshipFields<Model, Rel>} relationship - The relationship to join.
   * @returns {QueryBuilder<Model>} - Returns the current instance of QueryBuilder for method chaining.
   *
   * @example
   * const query = new QueryBuilder<User, UserRelMap>()
   * query.join('posts')
   * console.log(query) // QueryBuilder<User>
   * console.log(query.joinedRelationships) // [{ type: 'inner', relationship: 'posts' }]
   */
  join<R extends ExtractRelationshipFields<Model, Rel>>(relationship: R): this
  join<R extends ExtractRelationshipFields<Model, Rel>>(
    relationship: R,
    query: JoinQueryInput<ExtractRelationshipTargetModel<Model, R, Rel>>
  ): this
  join<R extends ExtractRelationshipFields<Model, Rel>>(
    relationship: R,
    query?: JoinQueryInput<ExtractRelationshipTargetModel<Model, R, Rel>>
  ): this {
    return this.addJoin(relationship, 'inner', query)
  }

  /**
   * Adds a left join to the query.
   *
   * @param {ExtractRelationshipFields<Model, Rel>} relationship - The relationship to join.
   * @returns {QueryBuilder<Model>} - Returns the current instance of QueryBuilder for method chaining.
   *
   * @example
   * const query = new QueryBuilder<User, UserRelMap>()
   * query.leftJoin('posts')
   * console.log(query) // QueryBuilder<User>
   * console.log(query.joinedRelationships) // [{ type: 'left', relationship: 'posts' }]
   */
  leftJoin<R extends ExtractRelationshipFields<Model, Rel>>(relationship: R): this
  leftJoin<R extends ExtractRelationshipFields<Model, Rel>>(
    relationship: R,
    query: JoinQueryInput<ExtractRelationshipTargetModel<Model, R, Rel>>
  ): this
  leftJoin<R extends ExtractRelationshipFields<Model, Rel>>(
    relationship: R,
    query?: JoinQueryInput<ExtractRelationshipTargetModel<Model, R, Rel>>
  ): this {
    return this.addJoin(relationship, 'left', query)
  }

  /**
   * Adds a right join to the query.
   *
   * @param {ExtractRelationshipFields<Model, Rel>} relationship - The relationship to join.
   * @returns {QueryBuilder<Model>} - Returns the current instance of QueryBuilder for method chaining.
   *
   * @example
   * const query = new QueryBuilder<User, UserRelMap>()
   * query.rightJoin('posts')
   * console.log(query) // QueryBuilder<User>
   * console.log(query.joinedRelationships) // [{ type: 'right', relationship: 'posts' }]
   */
  rightJoin<R extends ExtractRelationshipFields<Model, Rel>>(relationship: R): this
  rightJoin<R extends ExtractRelationshipFields<Model, Rel>>(
    relationship: R,
    query: JoinQueryInput<ExtractRelationshipTargetModel<Model, R, Rel>>
  ): this
  rightJoin<R extends ExtractRelationshipFields<Model, Rel>>(
    relationship: R,
    query?: JoinQueryInput<ExtractRelationshipTargetModel<Model, R, Rel>>
  ): this {
    return this.addJoin(relationship, 'right', query)
  }

  /**
   * Adds a full join to the query.
   *
   * @param {ExtractRelationshipFields<Model, Rel>} relationship - The relationship to join.
   * @returns {QueryBuilder<Model>} - Returns the current instance of QueryBuilder for method chaining.
   *
   * @example
   * const query = new QueryBuilder<User, UserRelMap>()
   * query.fullJoin('posts')
   * console.log(query) // QueryBuilder<User>
   * console.log(query.joinedRelationships) // [{ type: 'full', relationship: 'posts' }]
   */
  fullJoin<R extends ExtractRelationshipFields<Model, Rel>>(relationship: R): this
  fullJoin<R extends ExtractRelationshipFields<Model, Rel>>(
    relationship: R,
    query: JoinQueryInput<ExtractRelationshipTargetModel<Model, R, Rel>>
  ): this
  fullJoin<R extends ExtractRelationshipFields<Model, Rel>>(
    relationship: R,
    query?: JoinQueryInput<ExtractRelationshipTargetModel<Model, R, Rel>>
  ): this {
    return this.addJoin(relationship, 'full', query)
  }

  /**
   * Adds a cross join to the query.
   *
   * @param {ExtractRelationshipFields<Model, Rel>} relationship - The relationship to join.
   * @returns {QueryBuilder<Model>} - Returns the current instance of QueryBuilder for method chaining.
   *
   * @example
   * const query = new QueryBuilder<User, UserRelMap>()
   * query.crossJoin('posts')
   * console.log(query) // QueryBuilder<User>
   * console.log(query.joinedRelationships) // [{ type: 'cross', relationship: 'posts' }]
   */
  crossJoin<R extends ExtractRelationshipFields<Model, Rel>>(relationship: R): this
  crossJoin<R extends ExtractRelationshipFields<Model, Rel>>(
    relationship: R,
    query: JoinQueryInput<ExtractRelationshipTargetModel<Model, R, Rel>>
  ): this
  crossJoin<R extends ExtractRelationshipFields<Model, Rel>>(
    relationship: R,
    query?: JoinQueryInput<ExtractRelationshipTargetModel<Model, R, Rel>>
  ): this {
    return this.addJoin(relationship, 'cross', query)
  }

  /**
   * Adds a join to the query.
   *
   * @param {ExtractRelationshipFields<Model, Rel>} relationship - The relationship to join.
   * @param {JoinType} type - The type of join to add.
   * @returns {QueryBuilder<Model>} - Returns the current instance of QueryBuilder for method chaining.
   *
   * @example
   * const query = new QueryBuilder<User, UserRelMap>()
   * query.addJoin('posts', 'inner')
   * console.log(query) // QueryBuilder<User>
   * console.log(query.joinedRelationships) // [{ type: 'inner', relationship: 'posts' }]
   */
  private addJoin<R extends ExtractRelationshipFields<Model, Rel>>(
    relationship: R,
    type: JoinType,
    query?: JoinQueryInput<ExtractRelationshipTargetModel<Model, R, Rel>>
  ): this {
    const clone = this.clone()
    if (!clone.state.joins.some((join) => join.relationship === relationship)) {
      clone.state.joins.push({
        type,
        relationship,
        query: query ? this.resolveJoinQuery(query) : undefined
      })
    }
    return clone
  }

  private resolveJoinQuery<TargetModel extends object>(
    query: JoinQueryInput<TargetModel>
  ): QueryModel<TargetModel, EmptyRelationshipMap> {
    const builder = typeof query === 'function' ? query(this.createJoinQueryBuilder<TargetModel>()) : query
    return BaseQueryBuilder.cloneQueryModel(builder.getState())
  }

  private createJoinQueryBuilder<TargetModel extends object>(): QueryBuilder<TargetModel> {
    return new QueryBuilderBase<TargetModel>() as unknown as QueryBuilder<TargetModel>
  }
}
